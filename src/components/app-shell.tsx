"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import { IndexPanel } from '@/components/index-panel';
import { ViewerPanel } from '@/components/viewer-panel';
import { RelocateThumbnailsModal } from '@/components/relocate-thumbnails-modal';
import type { IndexItem } from '@/lib/types';
import { INDEX as INITIAL_INDEX } from '@/lib/constants';
import { loadAllSlidesCached, saveSlide } from '@/lib/services/slides';
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
  return items.map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { content, children, ...rest } = item;
    return {
      ...rest,
      ...(children && { children: stripContentFromIndex(children) }),
    };
  });
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

function mapContentToIndex(
  items: IndexItem[],
  contentMap: Map<string, string[] | null>,
  usedContentIds: Set<string>,
  parentId: string | null = null,
): IndexItem[] {
  return items.map(item => {
    const newItem = { ...item };

    const exact = contentMap.has(item.id) ? (contentMap.get(item.id) ?? null) : null;
    const exactHasContent = Array.isArray(exact) && exact.length > 0;

    let legacyId: string | null = null;
    let legacy: string[] | null = null;
    let legacyHasContent = false;
    if (parentId && item.id.startsWith(`${parentId}-`)) {
      legacyId = item.id.slice(parentId.length + 1);
      if (contentMap.has(legacyId)) {
        legacy = contentMap.get(legacyId) ?? null;
        legacyHasContent = Array.isArray(legacy) && legacy.length > 0;
      }
    }

    if (exactHasContent) {
      newItem.content = exact;
    } else if (legacyHasContent && legacyId) {
      newItem.content = legacy;
      usedContentIds.add(legacyId);
    } else if (contentMap.has(item.id)) {
      newItem.content = exact;
    }

    if (item.children) {
      newItem.children = mapContentToIndex(item.children, contentMap, usedContentIds, item.id);
    }
    return newItem;
  });
}

function ensureAllInitialTopics(stored: IndexItem[] | null, initial: IndexItem[]): IndexItem[] {
  const result: IndexItem[] = stored ? [...stored] : [];
  const byId = new Map<string, IndexItem>();

  function register(nodes: IndexItem[]) {
    for (const node of nodes) {
      byId.set(node.id, node);
      if (node.children) {
        register(node.children);
      }
    }
  }

  register(result);

  function ensureNode(initialNode: IndexItem, parentId: string | null) {
    let existing = byId.get(initialNode.id);
    if (!existing) {
      const newNode: IndexItem = {
        id: initialNode.id,
        title: initialNode.title,
      };
      if (parentId) {
        const parent = byId.get(parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(newNode);
        } else {
          result.push(newNode);
        }
      } else {
        result.push(newNode);
      }
      byId.set(initialNode.id, newNode);
      existing = newNode;
    }
    if (initialNode.children && initialNode.children.length > 0) {
      if (!existing.children) {
        existing.children = [];
      }
      for (const child of initialNode.children) {
        ensureNode(child, initialNode.id);
      }
    }
  }

  for (const root of initial) {
    ensureNode(root, null);
  }

  return result;
}

export default function AppShell() {
  const isMobile = useIsMobile();
  const [index, setIndex] = useState<IndexItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [relocateModalOpen, setRelocateModalOpen] = useState(false);
  const [itemsToRelocate, setItemsToRelocate] = useState<IndexItem[]>([]);
  const [firestoreWriteDisabled, setFirestoreWriteDisabled] = useState(false);

  useEffect(() => {
    async function restoreData() {
      try {
        let storedIndexStructure = ensureUniqueIds(INITIAL_INDEX);
        const allSlides = await loadAllSlidesCached();
        const contentMap = new Map<string, string[] | null>();
        allSlides.forEach(slide => contentMap.set(slide.id, slide.content));

        const debugIds = [
          'filtrado-frecuencia-the-basics-of-filtering-in-the-frequency-domain',
          'the-basics-of-filtering-in-the-frequency-domain',
        ];
        for (const id of debugIds) {
          if (!contentMap.has(id)) {
            console.log('[AppShell][Debug] Slide no existe en Firestore:', id);
            continue;
          }
          const c = contentMap.get(id);
          const n = Array.isArray(c) ? c.length : 0;
          console.log('[AppShell][Debug] Slide en Firestore:', { id, hasContent: Array.isArray(c) && c.length > 0, count: n });
        }

        const usedContentIds = new Set<string>();
        let restoredIndex = mapContentToIndex(storedIndexStructure, contentMap, usedContentIds);

        const allIndexIds = new Set([
          ...flattenIndex(restoredIndex).map(i => i.id),
          ...usedContentIds,
        ]);
        const orphanSlides = allSlides.filter(s => !allIndexIds.has(s.id));
        if (orphanSlides.length > 0) {
          console.log(`[AppShell] Encontradas ${orphanSlides.length} diapositivas huérfanas en BD.`);
          console.log('[AppShell] IDs huérfanos:', orphanSlides.map(s => s.id));
          const recoveredFolder: IndexItem = {
              id: `recovered-folder-${Date.now()}`,
              title: '📂 ARCHIVOS RECUPERADOS DE BD',
              children: orphanSlides.map(s => ({
                  id: s.id,
                  title: s.id, // Si tuviéramos un campo título en BD sería mejor, pero usamos ID
                  content: s.content,
              }))
          };
          restoredIndex = [...restoredIndex, recoveredFolder];
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
  const flatIds = useMemo(() => flatIndex.map(item => item.id), [flatIndex]);
  const selectedSlide = useMemo(() => flatIndex.find(item => item.id === selectedSlideId) || null, [flatIndex, selectedSlideId]);
  const selectedSlideIndex = useMemo(() => flatIndex.findIndex(s => s.id === selectedSlideId), [flatIndex, selectedSlideId]);
  const prevSlideId = useMemo(() => selectedSlideIndex > 0 ? flatIndex[selectedSlideIndex - 1].id : null, [flatIndex, selectedSlideIndex]);
  const nextSlideId = useMemo(() => selectedSlideIndex < flatIndex.length - 1 ? flatIndex[selectedSlideIndex + 1].id : null, [flatIndex, selectedSlideIndex]);
  const breadcrumbs = useMemo(() => selectedSlideId ? findPath(index, selectedSlideId) : [], [index, selectedSlideId]);

  const normalizeSelection = useCallback((ids: Set<string>) => {
    const selectedSet = new Set(ids);
    const topLevel = Array.from(selectedSet).filter((id) => {
      const path = findPath(index, id);
      if (!path) return false;
      return !path.slice(0, -1).some(p => selectedSet.has(p.id));
    });

    topLevel.sort((a, b) => flatIds.indexOf(a) - flatIds.indexOf(b));
    return topLevel;
  }, [index, flatIds]);

  const handleIndexChange = useCallback((newIndex: IndexItem[]) => {
    setIndex(newIndex);
    saveIndexStructureToStorage(newIndex);
  }, []);

  const handleSave = useCallback(
    (id: string, content: string[] | null) => {
      const applyLocalUpdate = () => {
        setIndex(prev =>
          produce(prev, (draft: IndexItem[]) => {
            const item = findItem(draft, id);
            if (item) item.content = content;
          }),
        );
      };

      applyLocalUpdate();

      if (firestoreWriteDisabled) {
        console.warn(
          'Skipping remote save for slide because Firestore writes are temporarily disabled after resource-exhausted.',
          { id },
        );
        return;
      }

      void saveSlide(id, content).catch((error) => {
        console.error("Failed to save slide:", error);
        const code = (error as { code?: string }).code;
        if (code === "resource-exhausted") {
          console.error(
            "Disabling further Firestore writes for this session after resource-exhausted error.",
          );
          setFirestoreWriteDisabled(true);
        }
      });
    },
    [firestoreWriteDisabled],
  );

  const handleRelocate = useCallback((newParentId: string | null, newPosition: number, moveIdsOverride?: string[]) => {
    const baseIds = moveIdsOverride && moveIdsOverride.length > 0
      ? moveIdsOverride
      : itemsToRelocate.map(i => i.id);
    if (baseIds.length === 0) return;

    const moveIds = normalizeSelection(new Set(baseIds));
    if (moveIds.length === 0) return;

    const newIndex = produce(index, (draft: IndexItem[]) => {
      const movedItems: IndexItem[] = [];

      for (const id of moveIds) {
        const result = findItemWithParent(draft, id);
        if (!result) continue;
        const { item, parent } = result;

        if (parent) {
          if (!parent.children) parent.children = [];
          const idx = parent.children.findIndex(child => child.id === id);
          if (idx >= 0) {
            parent.children.splice(idx, 1);
          }
        } else {
          const idx = draft.findIndex(child => child.id === id);
          if (idx >= 0) {
            draft.splice(idx, 1);
          }
        }

        movedItems.push(item);
      }

      let destinationArray: IndexItem[] = draft;
      let actualParentId: string | null = newParentId;

      if (newParentId) {
        const newParent = findItem(draft, newParentId);
        if (newParent) {
          if (!newParent.children) newParent.children = [];
          destinationArray = newParent.children;
        } else {
          actualParentId = null;
          destinationArray = draft;
        }
      }

      const clamped = Math.max(0, Math.min(newPosition, destinationArray.length));
      movedItems.forEach((item, offset) => {
        item.parentId = actualParentId || undefined;
        destinationArray.splice(clamped + offset, 0, item);
      });
    });

    handleIndexChange(newIndex);
    setRelocateModalOpen(false);
    setItemsToRelocate([]);
  }, [index, itemsToRelocate, handleIndexChange, normalizeSelection]);

  const handleMoveSubSlide = useCallback((sourceParentId: string, sourceIndex: number, destParentId: string, destIndex: number) => {
    if (!sourceParentId || !destParentId) return;
    if (sourceIndex < 0 || destIndex < 0) return;

    let sourceToSave: string[] | null = null;
    let destToSave: string[] | null = null;

    const newIndex = produce(index, (draft: IndexItem[]) => {
      const source = findItem(draft, sourceParentId);
      const dest = findItem(draft, destParentId);
      if (!source || !dest) return;

      const sourceArr = Array.isArray(source.content) ? [...source.content] : [];
      if (sourceIndex >= sourceArr.length) return;

      const moved = sourceArr[sourceIndex];
      sourceArr.splice(sourceIndex, 1);

      if (sourceParentId === destParentId) {
        const adjusted = destIndex > sourceIndex ? destIndex - 1 : destIndex;
        const clamped = Math.max(0, Math.min(adjusted, sourceArr.length));
        sourceArr.splice(clamped, 0, moved);
        source.content = sourceArr;
        sourceToSave = [...sourceArr];
        return;
      }

      const destArr = Array.isArray(dest.content) ? [...dest.content] : [];
      const clamped = Math.max(0, Math.min(destIndex, destArr.length));
      destArr.splice(clamped, 0, moved);

      source.content = sourceArr;
      dest.content = destArr;
      sourceToSave = [...sourceArr];
      destToSave = [...destArr];
    });

    handleIndexChange(newIndex);

    const persist = (id: string, content: string[] | null) => {
      if (firestoreWriteDisabled) {
        console.warn(
          'Skipping remote save for slide because Firestore writes are temporarily disabled after resource-exhausted.',
          { id },
        );
        return;
      }
      void saveSlide(id, content).catch((error) => {
        console.error('Failed to save slide:', error);
        const code = (error as { code?: string }).code;
        if (code === 'resource-exhausted') {
          console.error(
            'Disabling further Firestore writes for this session after resource-exhausted error.',
          );
          setFirestoreWriteDisabled(true);
        }
      });
    };

    if (sourceToSave) persist(sourceParentId, sourceToSave);
    if (destToSave) persist(destParentId, destToSave);
  }, [firestoreWriteDisabled, handleIndexChange, index]);

  const handlePasteSubSlides = useCallback((
    mode: 'copy' | 'cut',
    sources: Array<{ parentId: string; index: number }>,
    destParentId: string,
    destIndex: number,
    htmls: string[],
  ) => {
    if (!destParentId) return;
    if (!Array.isArray(htmls) || htmls.length === 0) return;
    if (destIndex < 0) return;

    const sourcesByParent = new Map<string, number[]>();
    if (mode === 'cut') {
      for (const s of sources) {
        if (!s?.parentId) continue;
        if (!Number.isFinite(s.index) || s.index < 0) continue;
        const arr = sourcesByParent.get(s.parentId) ?? [];
        arr.push(s.index);
        sourcesByParent.set(s.parentId, arr);
      }
      for (const [pid, idxs] of sourcesByParent) {
        const uniq = Array.from(new Set(idxs));
        uniq.sort((a, b) => b - a);
        sourcesByParent.set(pid, uniq);
      }
    }

    const idsToSave = new Map<string, string[] | null>();

    const newIndex = produce(index, (draft: IndexItem[]) => {
      if (mode === 'cut') {
        for (const [pid, idxsDesc] of sourcesByParent) {
          const src = findItem(draft, pid);
          if (!src) continue;
          const arr = Array.isArray(src.content) ? [...src.content] : [];
          for (const idx of idxsDesc) {
            if (idx >= 0 && idx < arr.length) arr.splice(idx, 1);
          }
          src.content = arr;
          idsToSave.set(pid, [...arr]);
        }
      }

      const dest = findItem(draft, destParentId);
      if (!dest) return;

      const destArr = Array.isArray(dest.content) ? [...dest.content] : [];
      let adjustedDestIndex = destIndex;
      if (mode === 'cut') {
        const removed = sourcesByParent.get(destParentId);
        if (removed && removed.length > 0) {
          const removedBefore = removed.filter((i) => i < destIndex).length;
          adjustedDestIndex = Math.max(0, destIndex - removedBefore);
        }
      }

      const clamped = Math.max(0, Math.min(adjustedDestIndex, destArr.length));
      const insert = htmls.filter((h) => typeof h === 'string');
      if (insert.length === 0) return;

      destArr.splice(clamped, 0, ...insert);
      dest.content = destArr;
      idsToSave.set(destParentId, [...destArr]);
    });

    handleIndexChange(newIndex);

    if (firestoreWriteDisabled) {
      console.warn(
        'Skipping remote save for slide because Firestore writes are temporarily disabled after resource-exhausted.',
      );
      return;
    }

    const persist = (id: string, content: string[] | null) => {
      void saveSlide(id, content).catch((error) => {
        console.error('Failed to save slide:', error);
        const code = (error as { code?: string }).code;
        if (code === 'resource-exhausted') {
          console.error(
            'Disabling further Firestore writes for this session after resource-exhausted error.',
          );
          setFirestoreWriteDisabled(true);
        }
      });
    };

    for (const [id, content] of idsToSave) {
      persist(id, content);
    }
  }, [firestoreWriteDisabled, handleIndexChange, index]);

  const openRelocateModal = useCallback((slideId: string) => {
    const useSelection = selectedIds.size > 0 && selectedIds.has(slideId);
    const base = useSelection ? selectedIds : new Set([slideId]);
    const moveIds = normalizeSelection(base);
    const items = moveIds
      .map(id => flatIndex.find(item => item.id === id))
      .filter(Boolean) as IndexItem[];
    if (items.length > 0) {
      setItemsToRelocate(items);
      setRelocateModalOpen(true);
    }
  }, [flatIndex, normalizeSelection, selectedIds]);

  const handleSelectSlide = useCallback((id: string, e: React.MouseEvent) => {
    const isMulti = e.ctrlKey || e.metaKey;
    const isRange = e.shiftKey;

    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (isRange && selectionAnchorId) {
        const a = flatIds.indexOf(selectionAnchorId);
        const b = flatIds.indexOf(id);
        if (!isMulti) next.clear();
        if (a >= 0 && b >= 0) {
          const [start, end] = a < b ? [a, b] : [b, a];
          for (let i = start; i <= end; i++) next.add(flatIds[i]);
        } else {
          next.add(id);
        }
        return next;
      }

      if (isMulti) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }

      next.clear();
      next.add(id);
      return next;
    });

    if (!isRange) setSelectionAnchorId(id);
    setSelectedSlideId(id);
    if (isMobile) setIsPanelOpen(false);
  }, [flatIds, isMobile, selectionAnchorId]);
  
  const handleMoveItem = useCallback((dragId: string, dropId: string) => {
    if (dragId === dropId) return;
    const newIndex = produce(index, (draft: IndexItem[]) => {
        const dragRes = findItemWithParent(draft, dragId);
        const dropRes = findItemWithParent(draft, dropId);
        if (!dragRes || !dropRes) return;
        
        const { item: dragItem, parent: dragParent } = dragRes;
        const { item: dropItem, parent: dropParent } = dropRes;
        
        // Remove dragItem from old location
        if (dragParent) {
            dragParent.children = dragParent.children?.filter((c: IndexItem) => c.id !== dragId);
        } else {
            const idx = draft.findIndex((c: IndexItem) => c.id === dragId);
            if (idx >= 0) draft.splice(idx, 1);
        }
        
        // Insert before dropItem
        if (dropParent) {
            if (!dropParent.children) dropParent.children = [];
            const idx = dropParent.children.findIndex((c: IndexItem) => c.id === dropId);
            // Handle case where dropItem was moved/removed logic if siblings (simplified)
            // Re-find index in case mutation shifted things? 
            // Since we removed dragItem first, indices might shift if in same array.
            // But findIndex runs on the current state of siblings.
            // Wait, if we removed dragItem, we need to get the ARRAY again.
            // dropParent might be same as dragParent.
            const freshDropParent = findItem(draft, dropParent.id);
            if(freshDropParent && freshDropParent.children) {
                let freshIdx = freshDropParent.children.findIndex((c: IndexItem) => c.id === dropId);
                if (freshIdx === -1) freshIdx = 0; 
                freshDropParent.children.splice(freshIdx, 0, dragItem);
            }
            dragItem.parentId = dropParent.id;
        } else {
            let idx = draft.findIndex((c: IndexItem) => c.id === dropId);
            if (idx === -1) idx = 0;
            draft.splice(idx, 0, dragItem);
            dragItem.parentId = undefined;
        }
    });
    setIndex(newIndex);
    saveIndexStructureToStorage(newIndex);
  }, [index]);

  if (!isLoaded) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><p className="text-foreground">Recuperando y limpiando datos...</p></div>;
  }

  return (
    <AppContext.Provider value={{ togglePresentationMode: handlePresentationToggle }}>
        <div className={cn("flex h-screen bg-background text-foreground overflow-hidden", isPresentationMode && "presentation-mode")}>
          <SidebarProvider open={isPanelOpen} onOpenChange={setIsPanelOpen} defaultOpen={!isMobile}>
            <div className={cn("flex h-full w-full")}>
                <div className={cn(isPresentationMode && "hidden")}>
                    <Sidebar>
                        <IndexPanel
                        data={index}
                        onSelect={handleSelectSlide}
                        activeSlideId={selectedSlideId}
                        selectedIds={selectedIds}
                        onIndexChange={handleIndexChange}
                        onMove={handleMoveItem}
                        />
                    </Sidebar>
                </div>
                <main className="flex-1 flex flex-col min-h-0 min-w-0">
                    <ViewerPanel
                        slide={selectedSlide}
                        index={index}
                        canPresent={true}
                        onSave={handleSave}
                        onRelocate={openRelocateModal}
                        isPresentationMode={isPresentationMode}
                        onNavigate={setSelectedSlideId}
                        prevSlideId={prevSlideId}
                        nextSlideId={nextSlideId}
                        breadcrumbs={breadcrumbs || []}
                    />
                </main>
                <div className={cn(isPresentationMode && "hidden")}>
                    <RelocateThumbnailsModal 
                        isOpen={relocateModalOpen}
                        onClose={() => setRelocateModalOpen(false)}
                        onConfirm={handleRelocate}
                        onMoveSubSlide={handleMoveSubSlide}
                        onPasteSubSlides={handlePasteSubSlides}
                        items={itemsToRelocate}
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

function findPath(items: IndexItem[], id: string): IndexItem[] | null {
    for (const item of items) {
        if (item.id === id) return [item];
        if (item.children) {
            const childPath = findPath(item.children, id);
            if (childPath) return [item, ...childPath];
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
