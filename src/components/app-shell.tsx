"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import { IndexPanel } from '@/components/index-panel';
import { ViewerPanel } from '@/components/viewer-panel';
import { RelocateSlideModal } from '@/components/relocate-slide-modal';
import type { IndexItem } from '@/lib/types';
import { INDEX as INITIAL_INDEX } from '@/lib/constants';
import { deleteSlide, loadAllSlidesCached, saveSlide } from '@/lib/services/slides';
import { produce } from 'immer';
import { cn } from '@/lib/utils';
import { AppContext } from './app-context';

const INDEX_STORAGE_KEY = 'presentation-index';

// --- Data Sanitization and Management ---
function ensureUniqueIds(items: IndexItem[], parentId = '', seenIds = new Set<string>()): IndexItem[] {
  return items.map((item, index) => {
    let uniqueId = item.id;
    if (seenIds.has(uniqueId)) {
      uniqueId = `${parentId}${parentId ? '-' : ''}${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`;
    }
    seenIds.add(uniqueId);
    const newItem = { ...item, id: uniqueId };
    if (item.children) {
      newItem.children = ensureUniqueIds(item.children, uniqueId, seenIds);
    }
    return newItem;
  });
}

function stripContentFromIndex(items: IndexItem[]): IndexItem[] {
  return items.map(({ content, children, ...rest }) => ({
    ...rest,
    ...(children && { children: stripContentFromIndex(children) }),
  }));
}

function getStoredIndex(): IndexItem[] | null {
  if (typeof window === 'undefined') return null;
  const storedIndex = localStorage.getItem(INDEX_STORAGE_KEY);
  return storedIndex ? JSON.parse(storedIndex) : null;
}

function saveIndexStructureToStorage(index: IndexItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const strippedIndex = stripContentFromIndex(index);
    localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(strippedIndex));
  } catch (error) {
    console.error("Failed to save index to localStorage:", error);
  }
}

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
      try {
        let storedIndexStructure = getStoredIndex() || INITIAL_INDEX;
        storedIndexStructure = ensureUniqueIds(storedIndexStructure);
        const allSlides = await loadAllSlidesCached();
        const contentMap = new Map<string, string[] | null>();
        allSlides.forEach(slide => contentMap.set(slide.id, slide.content));
        let restoredIndex = mapContentToIndex(storedIndexStructure, contentMap);
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
        setIndex(restoredIndex);
        saveIndexStructureToStorage(restoredIndex);
        setIsLoaded(true);
      } catch (error) {
        console.error("Fallo al restaurar datos, usando índice local:", error);
        const fallback = ensureUniqueIds(INITIAL_INDEX);
        setIndex(fallback);
        saveIndexStructureToStorage(fallback);
        setIsLoaded(true);
      }
    }
    restoreData();
  }, []);

  useEffect(() => {
    setIsPanelOpen(!isMobile);
  }, [isMobile]);

  // This function now simply toggles the state for our CSS-based fullscreen
  const handlePresentationToggle = useCallback(() => {
    setIsPresentationMode(prev => !prev);
  }, []);

  const flatIndex = useMemo(() => flattenIndex(index), [index]);
  const selectedSlide = useMemo(() => flatIndex.find(item => item.id === selectedSlideId) || null, [flatIndex, selectedSlideId]);
  const selectedSlideIndex = useMemo(() => flatIndex.findIndex(s => s.id === selectedSlideId), [flatIndex, selectedSlideId]);
  const prevSlideId = useMemo(() => selectedSlideIndex > 0 ? flatIndex[selectedSlideIndex - 1].id : null, [flatIndex, selectedSlideIndex]);
  const nextSlideId = useMemo(() => selectedSlideIndex < flatIndex.length - 1 ? flatIndex[selectedSlideIndex + 1].id : null, [flatIndex, selectedSlideIndex]);

  const handleIndexChange = useCallback((newIndex: IndexItem[]) => {
    setIndex(newIndex);
    saveIndexStructureToStorage(newIndex);
  }, []);

  const handleSave = useCallback(async (id: string, content: string[] | null) => {
    try {
      await saveSlide(id, content);
      const newIndex = produce(index, (draft: IndexItem[]) => {
        const item = findItem(draft, id);
        if (item) item.content = content;
      });
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

  const handleDelete = useCallback(async (slideId: string) => {
    try {
      await deleteSlide(slideId);
    } catch (e) {
      console.error('Failed to delete slide in DB:', e);
    }
    const newIndex = produce(index, (draft: IndexItem[]) => {
      const result = findItemWithParent(draft, slideId);
      if (!result) return;
      const { item, parent } = result;
      if (parent && parent.children) {
        parent.children = parent.children.filter(c => c.id !== item.id);
      } else {
        const idx = draft.findIndex(i => i.id === item.id);
        if (idx >= 0) draft.splice(idx, 1);
      }
    });
    handleIndexChange(newIndex);
    // Update selection
    const flat = flattenIndex(newIndex);
    const currentIdx = flat.findIndex(s => s.id === selectedSlideId);
    if (currentIdx === -1) {
      const next = flat[0]?.id ?? null;
      setSelectedSlideId(next);
    }
  }, [index, selectedSlideId, handleIndexChange]);

  const openRelocateModal = useCallback((slideId: string) => {
    const slide = flatIndex.find(item => item.id === slideId);
    if (slide) {
      setSlideToRelocate(slide);
      setRelocateModalOpen(true);
    }
  }, [flatIndex]);

  const handleSelectSlide = useCallback((id: string) => {
    setSelectedSlideId(id);
    if (isMobile) setIsPanelOpen(false);
  }, [isMobile]);
  
  if (!isLoaded) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><p className="text-foreground">Recuperando y limpiando datos...</p></div>;
  }

  return (
    <AppContext.Provider value={{ togglePresentationMode: handlePresentationToggle }}>
        <div className={cn("flex h-screen bg-background text-foreground", isPresentationMode && "presentation-mode")}>
          <SidebarProvider open={isPanelOpen} onOpenChange={setIsPanelOpen} defaultOpen={!isMobile}>
            <div className={cn("flex h-full w-full")}>
                <div className={cn(isPresentationMode && "hidden")}>
                    <Sidebar>
                        <IndexPanel
                        data={index}
                        onSelect={handleSelectSlide}
                        activeSlideId={selectedSlideId}
                        onIndexChange={handleIndexChange}
                        />
                    </Sidebar>
                </div>
                <main className="flex-1 flex flex-col">
                    <ViewerPanel
                        slide={selectedSlide}
                        onSave={handleSave}
                        onRelocate={openRelocateModal}
                        onDelete={handleDelete}
                        isPresentationMode={isPresentationMode}
                        onNavigate={setSelectedSlideId}
                        prevSlideId={prevSlideId}
                        nextSlideId={nextSlideId}
                    />
                </main>
                <div className={cn(isPresentationMode && "hidden")}>
                    <RelocateSlideModal 
                        isOpen={relocateModalOpen}
                        onClose={() => setRelocateModalOpen(false)}
                        onConfirm={handleRelocate}
                        slide={slideToRelocate}
                        index={index}
                    />
                </div>
            </div>
          </SidebarProvider>
        </div>
    </AppContext.Provider>
  );
}

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
