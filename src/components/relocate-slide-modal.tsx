"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, Folder, FolderOpen, CornerDownRight, File, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IndexItem } from '@/lib/types';

interface RelocateSlideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newParentId: string | null, newPosition: number) => void;
  slide: IndexItem | null;
  index: IndexItem[];
}

type InsertionPoint = {
  parentId: string | null;
  position: number;
  label: string;
};

export function RelocateSlideModal({ isOpen, onClose, onConfirm, slide, index }: RelocateSlideModalProps) {
  const [selectedInsertion, setSelectedInsertion] = useState<InsertionPoint | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && slide) {
      setSelectedInsertion(null);
      // Auto-expand the parent of the current item
      if (slide.parentId) {
        setExpandedIds(new Set([slide.parentId]));
      }
    }
  }, [isOpen, slide]);

  if (!slide) return null;

  const handleSubmit = () => {
    if (!selectedInsertion) return;
    onConfirm(selectedInsertion.parentId, selectedInsertion.position);
    onClose();
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const isInvalidTarget = (item: IndexItem) => {
    // Cannot move into itself or its descendants
    if (item.id === slide.id) return true;
    return isDescendant(item, slide.id);
  };

  const isInsertionSelected = (parentId: string | null, position: number) => {
    return selectedInsertion?.parentId === parentId && selectedInsertion?.position === position;
  };

  const renderInsertionPoint = (parentId: string | null, position: number, label: string, depth: number = 0) => {
    const isSelected = isInsertionSelected(parentId, position);

    return (
      <div
        key={`insert-${parentId || 'root'}-${position}`}
        className={cn(
          "flex items-center py-1 px-2 cursor-pointer transition-all group",
          isSelected && "bg-primary/10"
        )}
        style={{ paddingLeft: `${depth * 16 + 32}px` }}
        onClick={() => setSelectedInsertion({ parentId, position, label })}
      >
        <div className={cn(
          "flex items-center gap-2 flex-1 px-2 py-0.5 rounded border-2 border-dashed transition-colors",
          isSelected
            ? "border-primary bg-primary/5 text-primary font-medium"
            : "border-muted-foreground/20 hover:border-muted-foreground/40 text-muted-foreground/60 hover:text-muted-foreground"
        )}>
          <CornerDownRight size={12} />
          <span className="text-xs">{label}</span>
        </div>
      </div>
    );
  };

  const renderTreeItem = (item: IndexItem, depth: number = 0, siblings: IndexItem[] = [], indexInParent: number = 0) => {
    const isExpanded = expandedIds.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const hasContent = item.content && item.content.length > 0;
    const isFolder = hasChildren;
    const isSlide = hasContent && !isFolder; // Slide is an item with content but no children (or empty children)
    const disabled = isInvalidTarget(item);
    const isCurrentItem = slide.id === item.id;

    // Count number of slides (sub-slides) within this item
    const slideCount = hasContent ? (item.content?.length || 0) : 0;

    const insertionPoints: JSX.Element[] = [];

    // If this is the current item being moved, don't show insertion points for it
    if (!isCurrentItem) {
      // Show "insert before" for non-disabled items
      if (!disabled) {
        const parentId = item.parentId || null;
        insertionPoints.push(
          renderInsertionPoint(parentId, indexInParent, `Insertar antes de "${item.title}"`, depth)
        );
      }
    }

    const itemElement = (
      <div
        key={item.id}
        className={cn(
          "flex items-center py-1.5 px-2 rounded-md transition-colors text-sm select-none",
          disabled && "opacity-30",
          isCurrentItem && "bg-yellow-500/10 border-l-2 border-yellow-500"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <div
          className={cn(
            "p-0.5 mr-1 rounded-sm hover:bg-muted-foreground/10 transition-colors cursor-pointer",
            !hasChildren && "invisible"
          )}
          onClick={(e) => hasChildren && toggleExpand(item.id, e)}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>

        <div className="mr-2 text-muted-foreground">
          {isFolder ? (
            isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />
          ) : (
            <FileText size={16} className="text-blue-500" />
          )}
        </div>

        <span className="truncate flex-1">{item.title}</span>

        {/* Show slide count badge for items with content */}
        {hasContent && slideCount > 0 && (
          <span className="text-[10px] ml-2 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-600 dark:text-blue-400 font-mono">
            {slideCount} {slideCount === 1 ? 'slide' : 'slides'}
          </span>
        )}

        {isCurrentItem && (
          <span className="text-[10px] ml-2 px-1.5 py-0.5 bg-yellow-500/20 rounded text-yellow-700 dark:text-yellow-400 font-medium">
            Moviendo
          </span>
        )}
      </div>
    );

    const childrenElements: JSX.Element[] = [];

    // Render both structural children (folders/sections) AND content slides (individual slides)
    if (isExpanded && !disabled) {
      // CASE 1: If item has structural children (sub-sections/sub-folders)
      if (hasChildren) {
        // Add insertion point at the beginning of children
        if (!isCurrentItem) {
          childrenElements.push(
            renderInsertionPoint(item.id, 0, `Insertar al inicio de "${item.title}"`, depth + 1)
          );
        }

        // Render children
        item.children!.forEach((child, idx) => {
          const childElements = renderTreeItem(child, depth + 1, item.children!, idx);
          childrenElements.push(...childElements);
        });

        // Add insertion point at the end of children (if last child is not the current item)
        const lastChild = item.children![item.children!.length - 1];
        if (lastChild.id !== slide.id) {
          childrenElements.push(
            renderInsertionPoint(item.id, item.children!.length, `Insertar al final de "${item.title}"`, depth + 1)
          );
        }
      }
      // CASE 2: If item has content (individual slides) but no children
      else if (hasContent && !hasChildren) {
        // Render each individual slide in the content array
        item.content!.forEach((slideHtml, slideIdx) => {
          const slideNumber = slideIdx + 1;
          const totalSlides = item.content!.length;
          const slideLabel = `Slide ${slideNumber}/${totalSlides}`;

          // Add insertion point before this slide
          if (!isCurrentItem) {
            childrenElements.push(
              renderInsertionPoint(
                item.id,
                slideIdx,
                `Insertar antes de "${slideLabel}" en "${item.title}"`,
                depth + 1
              )
            );
          }

          // Render the slide item
          childrenElements.push(
            <div
              key={`${item.id}-slide-${slideIdx}`}
              className={cn(
                "flex items-center py-1.5 px-2 rounded-md transition-colors text-sm select-none",
                "hover:bg-muted/30"
              )}
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              <div className="w-4 mr-1" /> {/* Spacer for chevron */}

              <div className="mr-2 text-muted-foreground">
                <File size={14} className="text-purple-500" />
              </div>

              <span className="truncate flex-1 text-xs text-muted-foreground">
                {slideLabel}
              </span>

              <span className="text-[9px] ml-2 px-1 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-purple-600 dark:text-purple-400 font-mono">
                #{slideNumber}
              </span>
            </div>
          );
        });

        // Add insertion point after the last slide
        if (!isCurrentItem && item.content!.length > 0) {
          childrenElements.push(
            renderInsertionPoint(
              item.id,
              item.content!.length,
              `Insertar al final de "${item.title}"`,
              depth + 1
            )
          );
        }
      }
    }

    // If this is the last item in siblings and not the current item, add "insert after"
    const isLastInSiblings = indexInParent === siblings.length - 1;
    if (isLastInSiblings && !isCurrentItem && !disabled) {
      const parentId = item.parentId || null;
      insertionPoints.push(
        renderInsertionPoint(parentId, indexInParent + 1, `Insertar después de "${item.title}"`, depth)
      );
    }

    return [
      ...insertionPoints.slice(0, 1), // "before" insertion point
      itemElement,
      ...childrenElements,
      ...insertionPoints.slice(1), // "after" insertion point
    ];
  };

  const rootInsertionPoints: JSX.Element[] = [];

  // Add insertion at the very beginning of root
  if (index.length > 0 && index[0].id !== slide.id) {
    rootInsertionPoints.push(
      renderInsertionPoint(null, 0, "Insertar al principio (raíz)", 0)
    );
  }

  // Render all root items
  const allElements = index.flatMap((item, idx) => renderTreeItem(item, 0, index, idx));

  // Add insertion at the very end of root
  const lastRootItem = index[index.length - 1];
  if (lastRootItem && lastRootItem.id !== slide.id) {
    rootInsertionPoints.push(
      renderInsertionPoint(null, index.length, "Insertar al final (raíz)", 0)
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Reubicar: {slide.title}</DialogTitle>
          <DialogDescription>
            Selecciona el punto de inserción exacto donde quieres colocar este elemento. Los puntos disponibles están marcados con líneas punteadas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 border rounded-md bg-background mt-2">
          <ScrollArea className="h-[500px] p-2">
            {rootInsertionPoints[0]}
            {allElements}
            {rootInsertionPoints[1]}
          </ScrollArea>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!selectedInsertion}>
            {selectedInsertion ? `Mover aquí` : 'Selecciona una posición'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function isDescendant(parent: IndexItem, slideId: string): boolean {
  if (!parent.children) return false;
  for (const child of parent.children) {
    if (child.id === slideId) return true;
    if (isDescendant(child, slideId)) return true;
  }
  return false;
}
