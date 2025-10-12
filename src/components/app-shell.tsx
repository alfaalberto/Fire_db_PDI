"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import { IndexPanel } from '@/components/index-panel';
import { ViewerPanel } from '@/components/viewer-panel';
import { RelocateSlideModal } from '@/components/relocate-slide-modal';
import { Button } from '@/components/ui/button';
import { PanelLeftClose } from 'lucide-react';
import type { IndexItem } from '@/lib/types';
import { INDEX as INITIAL_INDEX } from '@/lib/constants';
import { loadAllSlidesFromDB, saveSlideToDB } from '@/lib/db';
import { produce } from 'immer';

const INDEX_STORAGE_KEY = 'presentation-index';

// Helper to remove content before saving to localStorage
function stripContentFromIndex(items: IndexItem[]): IndexItem[] {
  return items.map(({ content, children, ...rest }) => ({
    ...rest,
    ...(children && { children: stripContentFromIndex(children) }),
  }));
}

// Helper to get index structure from Local Storage
function getStoredIndex(): IndexItem[] | null {
  if (typeof window === 'undefined') return null;
  const storedIndex = localStorage.getItem(INDEX_STORAGE_KEY);
  return storedIndex ? JSON.parse(storedIndex) : null;
}

// Helper to save index structure to Local Storage
function saveIndexStructureToStorage(index: IndexItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const strippedIndex = stripContentFromIndex(index);
    localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(strippedIndex));
  } catch (error) {
    console.error("Failed to save index to localStorage:", error);
    // This will likely fail again if the structure is too big, but it's a safeguard.
  }
}

// Deeply maps over the index to set content from a map
function mapContentToIndex(items: IndexItem[], contentMap: Map<string, string[] | null>): IndexItem[] {
  return items.map(item => {
    const newItem = { ...item };
    if (contentMap.has(item.id)) {
      newItem.content = contentMap.get(item.id);
    }
    if (item.children) {
      newItem.children = mapContentToIndex(item.children, contentMap);
    }
    return newItem;
  });
}

export default function AppShell() {
  const isMobile = useIsMobile();
  const [index, setIndex] = useState<IndexItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [relocateModalOpen, setRelocateModalOpen] = useState(false);
  const [slideToRelocate, setSlideToRelocate] = useState<IndexItem | null>(null);

  useEffect(() => {
    async function restoreData() {
      // 1. Get the structure from localStorage or fallback to initial constant
      const storedIndexStructure = getStoredIndex() || INITIAL_INDEX;
      
      // 2. Load ALL slide content from the database
      const allSlides = await loadAllSlidesFromDB();
      const contentMap = new Map<string, string[] | null>();
      allSlides.forEach(slide => contentMap.set(slide.id, slide.content));

      // 3. Populate the structure with content for the in-memory state
      let restoredIndex = mapContentToIndex(storedIndexStructure, contentMap);
      
      // 4. Find and append any orphan slides (content exists in DB but not in structure)
      const allIndexIds = new Set(flattenIndex(restoredIndex).map(i => i.id));
      const orphanSlides = allSlides.filter(s => !allIndexIds.has(s.id));
      
      if (orphanSlides.length > 0) {
        const orphanIndexItems: IndexItem[] = orphanSlides.map(s => ({
            id: s.id,
            title: `(Recuperado) ${s.id}`,
            content: s.content,
        }));
        restoredIndex = [...restoredIndex, ...orphanIndexItems];
      }
      
      // 5. Set the complete, content-filled index to the state
      setIndex(restoredIndex);

      // 6. Save the STRUCTURE ONLY back to localStorage
      saveIndexStructureToStorage(restoredIndex);
      
      setIsLoaded(true);
    }
    
    restoreData();
  }, []);

  useEffect(() => {
      setIsPanelOpen(!isMobile);
  }, [isMobile]);

  const flatIndex = useMemo(() => flattenIndex(index), [index]);

  const selectedSlide = useMemo(() => {
    if (!selectedSlideId) return null;
    return flatIndex.find(item => item.id === selectedSlideId) || null;
  }, [flatIndex, selectedSlideId]);

  const selectedSlideIndex = useMemo(() => {
    return flatIndex.findIndex(s => s.id === selectedSlideId);
  }, [flatIndex, selectedSlideId]);

  const prevSlideId = useMemo(() => {
    return selectedSlideIndex > 0 ? flatIndex[selectedSlideIndex - 1].id : null;
  }, [flatIndex, selectedSlideIndex]);

  const nextSlideId = useMemo(() => {
    return selectedSlideIndex < flatIndex.length - 1 ? flatIndex[selectedSlideIndex + 1].id : null;
  }, [flatIndex, selectedSlideIndex]);

  // This is the single point of truth for updating and persisting the index
  const handleIndexChange = useCallback((newIndex: IndexItem[]) => {
    // Update the in-memory state with the full data (including content)
    setIndex(newIndex);
    // Persist only the structure to localStorage to avoid quota errors
    saveIndexStructureToStorage(newIndex);
  }, []);

  const handleSave = useCallback(async (id: string, content: string[] | null) => {
    try {
      await saveSlideToDB(id, content);
      const newIndex = produce(index, (draft: IndexItem[]) => {
        const item = findItem(draft, id);
        if (item) {
          item.content = content;
        }
      });
      // We don't need to call handleIndexChange here, as the index *structure* hasn't changed.
      // Let's just update the in-memory state.
      setIndex(newIndex);
    } catch (error) {
      console.error("Failed to save slide:", error);
    }
  }, [index]);

  const handleRelocate = useCallback((newParentId: string | null, newPosition: number) => {
    if (!slideToRelocate) return;

    const newIndex = produce(index, (draft: IndexItem[]) => {
      const result = findItemWithParent(draft, slideToRelocate.id);
      if (!result) return;
      const { item: itemToMove, parent: oldParent } = result;
      
      if (oldParent) {
        oldParent.children = oldParent.children?.filter(child => child.id !== itemToMove.id);
      } else {
        draft.splice(draft.findIndex(item => item.id === itemToMove.id), 1);
      }

      itemToMove.parentId = newParentId || undefined;

      if (newParentId) {
        const newParent = findItem(draft, newParentId);
        if (newParent) {
            if (!newParent.children) newParent.children = [];
            newParent.children.splice(newPosition, 0, itemToMove);
        }
      } else {
        draft.splice(newPosition, 0, itemToMove);
      }
    });

    handleIndexChange(newIndex);
    setRelocateModalOpen(false);
    setSlideToRelocate(null);
  }, [index, slideToRelocate, handleIndexChange]);

  const openRelocateModal = useCallback((slideId: string) => {
    const slide = flatIndex.find(item => item.id === slideId);
    if (slide) {
      setSlideToRelocate(slide);
      setRelocateModalOpen(true);
    }
  }, [flatIndex]);

  const handleSelectSlide = useCallback((id: string) => {
    setSelectedSlideId(id);
    if (isMobile) {
      setIsPanelOpen(false);
    }
  }, [isMobile]);
  
  if (!isLoaded) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-background">
              <p className="text-foreground">Recuperando datos...</p>
          </div>
      )
  }

  return (
    <SidebarProvider open={isPanelOpen} onOpenChange={setIsPanelOpen} defaultOpen={!isMobile}>
        <div className="flex h-screen bg-background text-foreground">
          <Sidebar>
            <IndexPanel
              data={index}
              onSelect={handleSelectSlide}
              activeSlideId={selectedSlideId}
              onIndexChange={handleIndexChange} // Pass the handler down
            />
          </Sidebar>

          <main className="flex-1 flex flex-col">
            {!isPanelOpen && !isPresentationMode && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 left-4 z-10"
                onClick={() => setIsPanelOpen(true)}
              >
                <PanelLeftClose />
              </Button>
            )}
            <ViewerPanel
              slide={selectedSlide}
              onSave={handleSave}
              onRelocate={openRelocateModal}
              isPresentationMode={isPresentationMode}
              togglePresentationMode={() => setIsPresentationMode(!isPresentationMode)}
              onNavigate={setSelectedSlideId}
              prevSlideId={prevSlideId}
              nextSlideId={nextSlideId}
            />
          </main>
            
          <RelocateSlideModal 
            isOpen={relocateModalOpen}
            onClose={() => setRelocateModalOpen(false)}
            onConfirm={handleRelocate}
            slide={slideToRelocate}
            index={index}
          />
        </div>
    </SidebarProvider>
  );
}

// Helper functions
function findItem(items: IndexItem[], id: string): IndexItem | undefined {
    for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
            const found = findItem(item.children, id);
            if (found) return found;
        }
    }
    return undefined;
}

function findItemWithParent(items: IndexItem[], id: string, parent: IndexItem | null = null): { item: IndexItem, parent: IndexItem | null } | null {
    for (const item of items) {
        if (item.id === id) return { item, parent };
        if (item.children) {
            const found = findItemWithParent(item.children, id, item);
            if (found) return found;
        }
    }
    return null;
}

function flattenIndex(items: IndexItem[]): IndexItem[] {
    const result: IndexItem[] = [];
    function recurse(items: IndexItem[]) {
      for (const item of items) {
        result.push(item);
        if (item.children) {
          recurse(item.children);
        }
      }
    }
    recurse(items);
    return result;
}
