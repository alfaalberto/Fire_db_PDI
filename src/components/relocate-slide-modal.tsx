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

  useEffect(() => {
    if (slide) {
      setNewParentId(slide.parentId || null);
    }
  }, [slide]);

  if (!slide) return null;

  const flatIndex = flattenIndex(index);
  const possibleParents = flatIndex.filter(item => item.id !== slide.id && !isDescendant(item, slide.id));
  
  const currentParent = slide.parentId ? findItem(index, slide.parentId) : null;

  const handleSubmit = () => {
    // Mover siempre al final del contenedor seleccionado para simplificar UX
    const targetParent = newParentId ? findItem(index, newParentId) : null;
    const targetSiblings = targetParent ? (targetParent.children || []) : index.filter(i => !i.parentId);
    // Si movemos al mismo padre, y queremos "mover al final", sería siblings.length - 1
    // Pero simplifiquemos: siempre append. La lógica de negocio en AppShell maneja el splice.
    // Si es el mismo padre, la posición relativa cambia.
    // Para simplificar al máximo: la posición será "última".
    let pos = targetSiblings.length;
    if (newParentId === slide.parentId) {
        // Si es el mismo padre, no hacemos nada o lo movemos al final.
        // Si el usuario elige el mismo padre, asumimos que quiere moverlo al final.
        pos = targetSiblings.length - 1;
    }
    onConfirm(newParentId, pos);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover Diapositiva</DialogTitle>
          <DialogDescription>
            Elige la sección donde quieres colocar "{slide.title}". Se moverá al final de la lista.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Ubicación actual: <span className="font-medium">{currentParent ? currentParent.title : 'Principal'}</span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="parent-select">Mover a:</Label>
            <Select onValueChange={(val) => setNewParentId(val === 'root' ? null : val)} defaultValue={slide.parentId || 'root'}>
              <SelectTrigger id="parent-select">
                <SelectValue placeholder="Seleccionar destino..." />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                <SelectItem value="root">-- Raíz (Principal) --</SelectItem>
                {possibleParents.map(parent => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Mover Aquí</Button>
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
