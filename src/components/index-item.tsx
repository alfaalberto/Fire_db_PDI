"use client";

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { IndexItem as IndexItemType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface IndexItemProps {
  item: IndexItemType;
  level: number;
  activeSlideId: string | null;
  onSelect: (id: string) => void;
  onMove: (dragId: string, dropId: string) => void;
}

export function IndexItem({ item, level, activeSlideId, onSelect, onMove }: IndexItemProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = activeSlideId === item.id;
  const isParentOfActive = activeSlideId ? activeSlideId.startsWith(`${item.id}.`) || activeSlideId.startsWith(`${item.id}p`) : false;
  
  const [isOpen, setIsOpen] = useState(isParentOfActive);

  useEffect(() => {
    if (isParentOfActive) {
      setIsOpen(true);
    }
  }, [isParentOfActive]);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(item.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dragId = e.dataTransfer.getData('text/plain');
    if (dragId && dragId !== item.id) {
      onMove(dragId, item.id);
    }
  };
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative flex items-center justify-between group rounded-md cursor-pointer transition-all duration-200 mx-1 my-0.5",
          isActive 
            ? 'bg-primary/10 text-primary font-medium shadow-sm' 
            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
        style={{ paddingLeft: `${level * 0.75 + 0.5}rem` }}
        onClick={handleSelect}
      >
        {isActive && <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-r-full" />}
        <span className="flex-1 truncate py-2 pr-1 text-sm leading-none">{item.title}</span>
        {hasChildren && (
          <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
            <div className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-background/50 transition-colors">
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          </CollapsibleTrigger>
        )}
      </div>

      {hasChildren && (
        <CollapsibleContent>
          <div className="flex flex-col">
            {(item.children ?? []).map(child => (
              <IndexItem
                key={child.id}
                item={child}
                level={level + 1}
                activeSlideId={activeSlideId}
                onSelect={onSelect}
                onMove={onMove}
              />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
