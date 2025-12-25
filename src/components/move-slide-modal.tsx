"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IndexItem } from '@/lib/types';

interface MoveSlideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newParentId: string | null, newPosition: number) => void;
  items: IndexItem[];
  index: IndexItem[];
}

type DestinationOption = {
  kind: 'container' | 'anchor';
  id: string | null;
  title: string;
  path: string;
  disabled: boolean;
};

type PositionOption = {
  position: number;
  label: string;
};

export function MoveSlideModal({ isOpen, onClose, onConfirm, items, index }: MoveSlideModalProps) {
  const [destinationQuery, setDestinationQuery] = useState('');
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  const moveRefs = useMemo(() => {
    if (items.length === 0) return [];
    return items
      .map((it) => findItemWithParent(index, it.id))
      .filter(Boolean) as Array<{ item: IndexItem; parent: IndexItem | null }>;
  }, [index, items]);

  const movingItems = useMemo(() => {
    if (moveRefs.length === 0) return items;
    return moveRefs.map(r => r.item);
  }, [items, moveRefs]);

  const movingIds = useMemo(() => new Set(movingItems.map(i => i.id)), [movingItems]);

  const destinations = useMemo<DestinationOption[]>(() => {
    if (movingItems.length === 0) return [];

    const options: DestinationOption[] = [
      {
        kind: 'container',
        id: null,
        title: 'Raíz',
        path: 'Raíz',
        disabled: false,
      },
    ];

    const movingChildrenById = new Map<string, IndexItem[] | undefined>();
    for (const it of movingItems) {
      movingChildrenById.set(it.id, it.children);
    }

    function visit(items: IndexItem[], pathTitles: string[]) {
      for (const item of items) {
        const nextPathTitles = [...pathTitles, item.title];

        const isSelf = movingIds.has(item.id);
        const isDesc = Array.from(movingChildrenById.values()).some((children) => containsId(children, item.id));
        const isContainer = (item.children && item.children.length > 0) || !item.content || item.content.length === 0;
        const anchorDisabled = isSelf || isDesc;
        const containerDisabled = isSelf || isDesc || !isContainer;

        options.push({
          kind: 'anchor',
          id: item.id,
          title: item.title,
          path: nextPathTitles.join(' / '),
          disabled: anchorDisabled,
        });

        if (isContainer) {
          options.push({
            kind: 'container',
            id: item.id,
            title: item.title,
            path: nextPathTitles.join(' / '),
            disabled: containerDisabled,
          });
        }

        if (item.children && item.children.length > 0) {
          visit(item.children, nextPathTitles);
        }
      }
    }

    visit(index, []);
    return options;
  }, [index, movingIds, movingItems]);

  const filteredDestinations = useMemo(() => {
    const q = destinationQuery.trim().toLowerCase();
    if (!q) return destinations;
    return destinations.filter(d => d.path.toLowerCase().includes(q));
  }, [destinations, destinationQuery]);

  const destinationTitle = useMemo(() => {
    const selected = destinations.find(d => d.id === selectedDestinationId);
    return selected?.path ?? 'Raíz';
  }, [destinations, selectedDestinationId]);

  const destinationChildren = useMemo<IndexItem[]>(() => {
    if (!selectedDestinationId) return index;
    const item = findItem(index, selectedDestinationId);
    return item?.children ?? [];
  }, [index, selectedDestinationId]);

  const siblingsWithoutMoving = useMemo(() => {
    return destinationChildren.filter(s => !movingIds.has(s.id));
  }, [destinationChildren, movingIds]);

  const positionOptions = useMemo<PositionOption[]>(() => {
    const options: PositionOption[] = [];
    options.push({ position: 0, label: 'Al inicio' });
    siblingsWithoutMoving.forEach((sib, idx) => {
      options.push({ position: idx + 1, label: `Después de "${sib.title}"` });
    });
    return options;
  }, [siblingsWithoutMoving]);

  useEffect(() => {
    if (!isOpen || items.length === 0) return;

    const parentId = moveRefs.length > 0 ? (moveRefs[0].parent?.id ?? null) : (items[0].parentId ?? null);
    const allSameParent = moveRefs.length > 0
      ? moveRefs.every(r => (r.parent?.id ?? null) === parentId)
      : items.every(it => (it.parentId ?? null) === parentId);
    setSelectedDestinationId(parentId);
    setSelectedAnchorId(null);
    setDestinationQuery('');
    setSelectedPosition(null);
    if (!allSameParent) setSelectedDestinationId(null);
  }, [isOpen, items, moveRefs]);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedPosition !== null) return;
    setSelectedPosition(siblingsWithoutMoving.length);
  }, [isOpen, siblingsWithoutMoving.length, selectedDestinationId, selectedPosition]);

  if (items.length === 0 || movingItems.length === 0) return null;

  const title = items.length === 1 ? items[0].title : `${items.length} elementos`;

  const canSubmit = selectedPosition !== null;

  const handleSubmit = () => {
    if (selectedPosition === null) return;
    onConfirm(selectedDestinationId, selectedPosition);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mover: {title}</DialogTitle>
          <DialogDescription>
            Elige el destino y la posición exacta. Puedes buscar secciones/subsecciones por nombre.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 mt-2">
          <div className="flex flex-col min-h-0 border rounded-md bg-background">
            <div className="p-3 border-b">
              <Input
                value={destinationQuery}
                onChange={(e) => setDestinationQuery(e.target.value)}
                placeholder="Buscar destino..."
              />
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="flex flex-col gap-1">
                {filteredDestinations.map((dest) => {
                  const isSelected =
                    (dest.kind === 'container' && dest.id === selectedDestinationId && selectedAnchorId === null) ||
                    (dest.kind === 'anchor' && dest.id === selectedAnchorId);
                  return (
                    <button
                      key={`dest-${dest.kind}-${dest.id ?? 'root'}`}
                      type="button"
                      disabled={dest.disabled}
                      className={cn(
                        'w-full text-left rounded-md px-2 py-2 transition-colors flex items-center gap-2',
                        dest.disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-muted/40',
                        isSelected && 'bg-primary/10 text-primary'
                      )}
                      onClick={() => {
                        if (dest.disabled) return;
                        if (dest.kind === 'container') {
                          setSelectedAnchorId(null);
                          setSelectedDestinationId(dest.id);
                          setSelectedPosition(null);
                          return;
                        }

                        const anchorId = dest.id;
                        if (!anchorId) return;

                        const anchorRef = findItemWithParent(index, anchorId);
                        const parentId = anchorRef?.parent?.id ?? null;
                        const rawSiblings = anchorRef?.parent?.children ?? index;
                        const siblings = rawSiblings.filter(s => !movingIds.has(s.id));
                        const idx = siblings.findIndex(s => s.id === anchorId);

                        setSelectedAnchorId(anchorId);
                        setSelectedDestinationId(parentId);
                        setSelectedPosition(idx >= 0 ? idx + 1 : siblings.length);
                      }}
                    >
                      <span className="text-muted-foreground">
                        {dest.kind === 'container'
                          ? (isSelected ? <FolderOpen size={16} /> : <Folder size={16} />)
                          : <FileText size={16} />}
                      </span>
                      <span className="text-sm truncate">{dest.path}</span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col min-h-0 border rounded-md bg-background">
            <div className="p-3 border-b">
              <div className="text-xs text-muted-foreground">Destino</div>
              <div className="text-sm font-medium truncate">{destinationTitle}</div>
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="flex flex-col gap-1">
                {positionOptions.map((opt) => {
                  const isSelected = opt.position === selectedPosition;
                  return (
                    <button
                      key={`pos-${opt.position}`}
                      type="button"
                      className={cn(
                        'w-full text-left rounded-md px-2 py-2 transition-colors',
                        'hover:bg-muted/40',
                        isSelected && 'bg-primary/10 text-primary'
                      )}
                      onClick={() => setSelectedPosition(opt.position)}
                    >
                      <span className="text-sm">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Mover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function findItemWithParent(
  items: IndexItem[],
  id: string,
  parent: IndexItem | null = null,
): { item: IndexItem; parent: IndexItem | null } | null {
  for (const item of items) {
    if (item.id === id) return { item, parent };
    if (item.children) {
      const found = findItemWithParent(item.children, id, item);
      if (found) return found;
    }
  }
  return null;
}

function containsId(items: IndexItem[] | undefined, id: string): boolean {
  if (!items) return false;
  for (const item of items) {
    if (item.id === id) return true;
    if (item.children && item.children.length > 0) {
      if (containsId(item.children, id)) return true;
    }
  }
  return false;
}
