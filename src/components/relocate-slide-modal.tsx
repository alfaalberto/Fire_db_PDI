"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { IndexItem } from '@/lib/types';

interface RelocateSlideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newParentId: string | null, newPosition: number) => void;
  slide: IndexItem | null;
  index: IndexItem[];
}

export function RelocateSlideModal({ isOpen, onClose, onConfirm, slide, index }: RelocateSlideModalProps) {
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newPosition, setNewPosition] = useState<number>(0);

  useEffect(() => {
    if (slide) {
      setNewParentId(slide.parentId || null);
      const siblings = slide.parentId
        ? findItem(index, slide.parentId)?.children || []
        : index.filter(item => !item.parentId);

      const currentPosition = siblings.findIndex(item => item.id === slide.id);
      setNewPosition(currentPosition >= 0 ? currentPosition : 0);
    }
  }, [slide, index]);

  useEffect(() => {
    if (!slide) return;

    const selectedParent = newParentId ? findItem(index, newParentId) : null;
    const siblings = selectedParent ? selectedParent.children || [] : index.filter(item => !item.parentId);

    if (newParentId !== slide.parentId) {
      setNewPosition(Math.max(0, siblings.length));
    } else {
      const currentPosition = siblings.findIndex(item => item.id === slide.id);
      setNewPosition(currentPosition >= 0 ? currentPosition : 0);
    }
  }, [newParentId, slide, index]);

  if (!slide) return null;

  const flatIndex = flattenIndex(index);
  const possibleParents = flatIndex.filter(item => item.id !== slide.id && !isDescendant(item, slide.id));
  
  const selectedParent = newParentId ? findItem(index, newParentId) : null;
  const siblings = selectedParent ? selectedParent.children || [] : index.filter(item => !item.parentId);

  const currentParent = slide.parentId ? findItem(index, slide.parentId) : null;
  const currentSiblings = slide.parentId
    ? findItem(index, slide.parentId)?.children || []
    : index.filter(item => !item.parentId);
  const currentPosition = currentSiblings.findIndex(item => item.id === slide.id);
  const currentSiblingsCount = currentSiblings.length;

  const maxPosition = newParentId === slide.parentId 
    ? Math.max(0, siblings.length -1)
    : siblings.length;

  const handleSubmit = () => {
    onConfirm(newParentId, newPosition);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reubicar Diapositiva: {slide.title}</DialogTitle>
          <DialogDescription>
            Selecciona una nueva sección y posición para esta diapositiva.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-xs text-muted-foreground">
            Ubicación actual: {currentParent ? currentParent.title : 'Nivel principal (sin contenedor)'} · posición {currentPosition + 1} de {currentSiblingsCount}
          </p>
          <div>
            <Label htmlFor="parent-select">Nueva sección contenedora</Label>
            <Select onValueChange={(val) => setNewParentId(val === 'root' ? null : val)} defaultValue={slide.parentId || 'root'}>
              <SelectTrigger id="parent-select">
                <SelectValue placeholder="Seleccionar sección..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Nivel principal (sin contenedor)</SelectItem>
                {possibleParents.map(parent => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="position-select">Nueva Posición</Label>
            <Select onValueChange={(val) => setNewPosition(Number(val))} value={String(newPosition)}>
              <SelectTrigger id="position-select">
                <SelectValue placeholder="Seleccionar posición..." />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxPosition + 1 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {i === maxPosition && newParentId !== slide.parentId ? 'Mover al final' : `Posición ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {siblings.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Esta sección tiene {siblings.length} diapositiva{siblings.length === 1 ? '' : 's'}. La diapositiva se moverá a la posición {newPosition + 1}.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Mover Diapositiva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function isDescendant(parent: IndexItem, slideId: string): boolean {
    if (!parent.children) return false;
    for (const child of parent.children) {
        if (child.id === slideId) return true;
        if (isDescendant(child, slideId)) return true;
    }
    return false;
}
