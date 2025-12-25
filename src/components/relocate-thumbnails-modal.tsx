"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IndexItem } from '@/lib/types';
import { SlideIframe } from '@/components/slide-iframe';

interface RelocateThumbnailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newParentId: string | null, newPosition: number, moveIds: string[]) => void;
  onMoveSubSlide: (sourceParentId: string, sourceIndex: number, destParentId: string, destIndex: number) => void;
  onPasteSubSlides: (
    mode: 'copy' | 'cut',
    sources: Array<{ parentId: string; index: number }>,
    destParentId: string,
    destIndex: number,
    htmls: string[],
  ) => void;
  items: IndexItem[];
  index: IndexItem[];
}

type DropTarget = {
  parentId: string | null;
  position: number;
};

type DragKind = 'item' | 'subslide' | null;

type SubSlideDragData = {
  kind: 'subslide';
  parentId: string;
  index: number;
};

function encodeSubSlideDrag(data: SubSlideDragData): string {
  return `subslide|${data.parentId}|${data.index}`;
}

function decodeSubSlideDrag(raw: string): SubSlideDragData | null {
  if (!raw) return null;
  const parts = raw.split('|');
  if (parts.length !== 3) return null;
  if (parts[0] !== 'subslide') return null;
  const parentId = parts[1];
  const idx = Number(parts[2]);
  if (!parentId || !Number.isFinite(idx)) return null;
  return { kind: 'subslide', parentId, index: idx };
}

function SubSlideThumb({
  parent,
  subIndex,
  html,
  isSelected,
  dragKind,
  setDragKind,
  onMoveSubSlide,
  onClick,
  onContextMenu,
  dragPointerYRef,
}: {
  parent: IndexItem;
  subIndex: number;
  html: string;
  isSelected: boolean;
  dragKind: DragKind;
  setDragKind: React.Dispatch<React.SetStateAction<DragKind>>;
  onMoveSubSlide: (sourceParentId: string, sourceIndex: number, destParentId: string, destIndex: number) => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
  dragPointerYRef: React.MutableRefObject<number | null>;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const any = entries.some((e) => e.isIntersecting);
        if (any) setInView(true);
      },
      { root: null, rootMargin: '250px', threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-md border bg-background overflow-hidden',
        'cursor-grab active:cursor-grabbing',
        isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border',
      )}
      draggable
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', encodeSubSlideDrag({ kind: 'subslide', parentId: parent.id, index: subIndex }));
        e.dataTransfer.effectAllowed = 'move';
        setDragKind('subslide');
      }}
      onDragEnd={() => {
        setDragKind(null);
        dragPointerYRef.current = null;
      }}
      onDragOver={(e) => {
        if (dragKind !== 'subslide') return;
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        if (dragKind !== 'subslide') return;
        e.stopPropagation();
        e.preventDefault();
        const raw = e.dataTransfer.getData('text/plain');
        const parsed = decodeSubSlideDrag(raw);
        if (!parsed) return;
        onMoveSubSlide(parsed.parentId, parsed.index, parent.id, subIndex);
      }}
    >
      <div className="h-20 w-full bg-black/50 pointer-events-none">
        {inView ? (
          <SlideIframe content={html} title={`${parent.title} #${subIndex + 1}`} thumbnail />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
            Cargando…
          </div>
        )}
      </div>
      <div className="px-2 py-1 text-[10px] text-muted-foreground truncate">
        #{subIndex + 1}
      </div>
    </div>
  );
}

export function RelocateThumbnailsModal({ isOpen, onClose, onConfirm, onMoveSubSlide, onPasteSubSlides, items, index }: RelocateThumbnailsModalProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState<DropTarget | null>(null);
  const [dragKind, setDragKind] = useState<DragKind>(null);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const dragPointerYRef = useRef<number | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);

  const [selectedMoveIds, setSelectedMoveIds] = useState<Set<string>>(new Set());
  const [subSlideLimits, setSubSlideLimits] = useState<Record<string, number>>({});

  const [selectedSubSlides, setSelectedSubSlides] = useState<Set<string>>(new Set());
  const [subSlideAnchor, setSubSlideAnchor] = useState<{ parentId: string; index: number } | null>(null);
  const [subSlideClipboard, setSubSlideClipboard] = useState<{
    mode: 'copy' | 'cut';
    sources: Array<{ parentId: string; index: number }>;
    htmls: string[];
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    pasteParentId: string;
    pasteIndex: number;
    clickedParentId: string;
    clickedIndex: number;
  } | null>(null);

  const keyForSubSlide = (parentId: string, subIndex: number) => `${parentId}::${subIndex}`;

  const getViewportEl = () => {
    try {
      const root = scrollAreaRef.current;
      return (root?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null) ?? null;
    } catch {
      return null;
    }
  };

  const selectSubSlide = (parentId: string, subIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isMulti = e.ctrlKey || e.metaKey;
    const isRange = e.shiftKey;

    setSelectedSubSlides((prev) => {
      const next = new Set(prev);
      const k = keyForSubSlide(parentId, subIndex);

      if (isRange && subSlideAnchor && subSlideAnchor.parentId === parentId) {
        const a = subSlideAnchor.index;
        const b = subIndex;
        const [start, end] = a < b ? [a, b] : [b, a];
        if (!isMulti) next.clear();
        for (let i = start; i <= end; i++) next.add(keyForSubSlide(parentId, i));
        return next;
      }

      if (isMulti) {
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return next;
      }

      next.clear();
      next.add(k);
      return next;
    });

    if (!e.shiftKey) setSubSlideAnchor({ parentId, index: subIndex });
  };

  const openSubSlideMenu = (
    pasteParentId: string,
    pasteIndex: number,
    clickedParentId: string,
    clickedIndex: number,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      pasteParentId,
      pasteIndex,
      clickedParentId,
      clickedIndex,
    });
  };

  const doCopy = (mode: 'copy' | 'cut', fallbackParentId: string, fallbackIndex: number) => {
    const toCopy: Array<{ parentId: string; index: number }> = [];
    if (selectedSubSlides.size > 0) {
      for (const k of selectedSubSlides) {
        const [p, i] = k.split('::');
        const idx = Number(i);
        if (!p || !Number.isFinite(idx)) continue;
        toCopy.push({ parentId: p, index: idx });
      }
    } else {
      toCopy.push({ parentId: fallbackParentId, index: fallbackIndex });
    }

    toCopy.sort((a, b) => (a.parentId === b.parentId ? a.index - b.index : a.parentId.localeCompare(b.parentId)));

    const htmls: string[] = [];
    for (const it of toCopy) {
      const parent = findItem(index, it.parentId);
      const arr = Array.isArray(parent?.content) ? parent!.content : [];
      const html = arr[it.index];
      if (typeof html === 'string') htmls.push(html);
    }
    setSubSlideClipboard(htmls.length > 0 ? { mode, sources: toCopy, htmls } : null);
  };

  const doPaste = (destParentId: string, destIndex: number) => {
    if (!subSlideClipboard || subSlideClipboard.htmls.length === 0) return;

    // Asegura visibilidad: expandir destino y subir el límite para que se vean las pegadas.
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(destParentId);
      return next;
    });
    setSubSlideLimits((prev) => ({
      ...prev,
      [destParentId]: Math.max(prev[destParentId] ?? 24, destIndex + subSlideClipboard.htmls.length),
    }));

    onPasteSubSlides(subSlideClipboard.mode, subSlideClipboard.sources, destParentId, destIndex, subSlideClipboard.htmls);

    if (subSlideClipboard.mode === 'cut') {
      setSubSlideClipboard(null);
      setSelectedSubSlides(new Set());
      setSubSlideAnchor(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const viewport = getViewportEl();
    if (!viewport) return;

    const onWheel = (e: WheelEvent) => {
      try {
        viewport.scrollTop += e.deltaY;
        e.preventDefault();
        e.stopPropagation();
      } catch {
        // ignore
      }
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', onWheel);
    };
  }, [isOpen]);

  const normalizedMoveIds = useMemo(() => {
    const selectedSet = new Set(selectedMoveIds);
    const topLevel = Array.from(selectedSet).filter((id) => {
      const path = findPath(index, id);
      if (!path) return false;
      return !path.slice(0, -1).some(p => selectedSet.has(p.id));
    });
    return topLevel;
  }, [index, selectedMoveIds]);

  const movingIds = useMemo(() => new Set(normalizedMoveIds), [normalizedMoveIds]);

  const invalidTargetIds = useMemo(() => {
    const set = new Set<string>();

    function visit(nodes: IndexItem[] | undefined) {
      if (!nodes) return;
      for (const n of nodes) {
        set.add(n.id);
        if (n.children && n.children.length > 0) visit(n.children);
      }
    }

    for (const id of normalizedMoveIds) {
      const it = findItem(index, id);
      if (!it) continue;
      set.add(it.id);
      visit(it.children);
    }

    return set;
  }, [index, normalizedMoveIds]);

  useEffect(() => {
    if (!isOpen) return;
    const next = new Set<string>();
    for (const it of items) {
      const path = findPath(index, it.id);
      if (path) {
        for (const p of path.slice(0, -1)) next.add(p.id);
      }
    }
    setExpandedIds(next);
    setSelectedMoveIds(new Set(items.map(i => i.id)));
    setSubSlideLimits({});
    setSelectedSubSlides(new Set());
    setSubSlideAnchor(null);
    setContextMenu(null);
    setDragOver(null);
    setDragKind(null);
    dragPointerYRef.current = null;
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, [isOpen, index, items]);

  const isDragging = dragKind !== null;

  useEffect(() => {
    if (!isDragging) {
      dragPointerYRef.current = null;
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
      return;
    }

    const step = () => {
      try {
        const viewport = getViewportEl();
        const y = dragPointerYRef.current;
        if (viewport && y !== null) {
          const rect = viewport.getBoundingClientRect();
          const threshold = 64;
          let delta = 0;
          if (y < rect.top + threshold) {
            delta = -Math.min(24, (rect.top + threshold - y) / 2);
          } else if (y > rect.bottom - threshold) {
            delta = Math.min(24, (y - (rect.bottom - threshold)) / 2);
          }
          if (delta !== 0) {
            viewport.scrollTop += delta;
          }
        }
      } catch {
        // ignore
      }
      autoScrollRafRef.current = requestAnimationFrame(step);
    };

    autoScrollRafRef.current = requestAnimationFrame(step);
    return () => {
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
    };
  }, [isDragging]);

  const title = items.length === 1 ? items[0].title : `${items.length} elementos`;

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isDropSelected = (parentId: string | null, position: number) => {
    return dragOver?.parentId === parentId && dragOver?.position === position;
  };

  const submitDrop = (target: DropTarget) => {
    if (target.parentId !== null && invalidTargetIds.has(target.parentId)) return;
    if (normalizedMoveIds.length === 0) return;
    setDragKind(null);
    setDragOver(null);
    dragPointerYRef.current = null;
    onConfirm(target.parentId, target.position, normalizedMoveIds);
    onClose();
  };

  const renderInsertionPoint = (parentId: string | null, position: number, depth: number, key: string) => {
    const selected = isDropSelected(parentId, position);
    const disabled = parentId !== null && invalidTargetIds.has(parentId);

    return (
      <div
        key={key}
        className={cn(
          'h-4 mx-2 rounded-sm transition-colors',
          disabled ? 'opacity-30' : 'cursor-pointer',
          selected ? 'bg-primary/20' : 'bg-transparent hover:bg-muted/40',
          dragKind === 'item' && !disabled && 'border border-dashed border-muted-foreground/30',
        )}
        style={{ marginLeft: `${depth * 16 + 8}px` }}
        onDragOver={(e) => {
          if (dragKind !== 'item' || disabled) return;
          e.preventDefault();
          setDragOver({ parentId, position });
        }}
        onDragLeave={() => {
          if (dragKind !== 'item') return;
          setDragOver((prev) => (prev?.parentId === parentId && prev?.position === position ? null : prev));
        }}
        onDrop={(e) => {
          if (dragKind !== 'item' || disabled) return;
          e.preventDefault();
          submitDrop({ parentId, position });
        }}
      />
    );
  };

  const renderSlideCard = (item: IndexItem, depth: number, parentId: string | null, insertPosAfter: number) => {
    const isSelected = movingIds.has(item.id);
    const hasChildren = !!item.children && item.children.length > 0;
    const thumb = item.content && item.content.length > 0 ? item.content[0] : '';
    const subSlides = Array.isArray(item.content) ? item.content : [];
    const showSubSlides = expandedIds.has(item.id);
    const canExpandSubSlides = !hasChildren && subSlides.length > 0;
    const limit = subSlideLimits[item.id] ?? 24;
    const visible = subSlides.slice(0, limit);

    return (
      <div
        key={item.id}
        className={cn(
          'mx-2 my-1 rounded-md border bg-background overflow-hidden',
          isSelected ? 'border-primary bg-primary/5' : 'border-border',
        )}
        style={{ marginLeft: `${depth * 16 + 8}px` }}
        draggable
        onContextMenu={(e) => {
          // Permite pegar aunque el subtema destino esté colapsado.
          if (hasChildren) return;
          openSubSlideMenu(item.id, subSlides.length, item.id, Math.max(0, subSlides.length - 1), e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          const isMulti = e.ctrlKey || e.metaKey;
          setSelectedMoveIds((prev) => {
            const next = new Set(prev);
            if (isMulti) {
              if (next.has(item.id)) next.delete(item.id);
              else next.add(item.id);
              return next;
            }
            next.clear();
            next.add(item.id);
            return next;
          });
        }}
        onDragStart={(e) => {
          if (!isSelected) {
            setSelectedMoveIds(new Set([item.id]));
          }
          e.dataTransfer.setData('text/plain', item.id);
          e.dataTransfer.effectAllowed = 'move';
          setDragKind('item');
        }}
        onDragEnd={() => {
          setDragKind(null);
          setDragOver(null);
          dragPointerYRef.current = null;
        }}
        onDragOver={(e) => {
          if (dragKind === null) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragKind === 'item') {
            submitDrop({ parentId, position: insertPosAfter });
            return;
          }
          if (dragKind === 'subslide') {
            const raw = e.dataTransfer.getData('text/plain');
            const parsed = decodeSubSlideDrag(raw);
            if (!parsed) return;
            onMoveSubSlide(parsed.parentId, parsed.index, item.id, subSlides.length);
          }
        }}
      >
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b bg-muted/20">
          <div className="flex items-center gap-2 min-w-0">
            <Move size={14} className={cn('shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
            {canExpandSubSlides && (
              <button
                type="button"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(item.id);
                }}
                title={showSubSlides ? 'Contraer' : 'Expandir'}
              >
                {showSubSlides ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            <div className="text-sm font-medium truncate">{item.title}</div>
            {hasChildren && <div className="text-[10px] text-muted-foreground">(contiene subsecciones)</div>}
            {!hasChildren && subSlides.length > 1 && (
              <div className="text-[10px] text-muted-foreground">({subSlides.length} diapositivas)</div>
            )}
          </div>
          {isSelected && (
            <div className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary">Moviendo</div>
          )}
        </div>
        <div className="p-2">
          {thumb ? (
            <div className="w-full h-24 rounded-md overflow-hidden border bg-black/50 pointer-events-none">
              <SlideIframe content={thumb} title={item.title} thumbnail />
            </div>
          ) : (
            <div className="w-full h-24 rounded-md border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
              Sin miniatura
            </div>
          )}
        </div>

        {canExpandSubSlides && showSubSlides && (
          <div
            className="px-2 pb-2"
            onDragOver={(e) => {
              if (dragKind !== 'subslide') return;
              e.stopPropagation();
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              if (dragKind !== 'subslide') return;
              e.stopPropagation();
              e.preventDefault();
              const raw = e.dataTransfer.getData('text/plain');
              const parsed = decodeSubSlideDrag(raw);
              if (!parsed) return;
              onMoveSubSlide(parsed.parentId, parsed.index, item.id, subSlides.length);
            }}
            onContextMenu={(e) => openSubSlideMenu(item.id, subSlides.length, item.id, Math.max(0, subSlides.length - 1), e)}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {visible.map((html, idx) => (
                <SubSlideThumb
                  key={`sub-${item.id}-${idx}`}
                  parent={item}
                  subIndex={idx}
                  html={html}
                  isSelected={selectedSubSlides.has(keyForSubSlide(item.id, idx))}
                  dragKind={dragKind}
                  setDragKind={setDragKind}
                  onMoveSubSlide={onMoveSubSlide}
                  onClick={(e) => selectSubSlide(item.id, idx, e)}
                  onContextMenu={(e) => {
                    if (!selectedSubSlides.has(keyForSubSlide(item.id, idx))) {
                      selectSubSlide(item.id, idx, e);
                    } else {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                    openSubSlideMenu(item.id, idx, item.id, idx, e);
                  }}
                  dragPointerYRef={dragPointerYRef}
                />
              ))}
            </div>
            {limit < subSlides.length && (
              <div className="mt-2 flex justify-center">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSubSlideLimits((prev) => ({
                      ...prev,
                      [item.id]: Math.min(subSlides.length, (prev[item.id] ?? 24) + 24),
                    }));
                  }}
                >
                  Mostrar más ({Math.min(subSlides.length, limit + 24)} / {subSlides.length})
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderNodes = (nodes: IndexItem[], parentId: string | null, depth: number) => {
    const rendered: React.ReactNode[] = [];

    let pos = 0;
    rendered.push(renderInsertionPoint(parentId, 0, depth, `ins-${parentId ?? 'root'}-0`));

    for (const node of nodes) {
      const isMoving = movingIds.has(node.id);
      const hasChildren = !!node.children && node.children.length > 0;
      const isExpanded = expandedIds.has(node.id);

      if (!isMoving) {
        rendered.push(renderInsertionPoint(parentId, pos, depth, `ins-${parentId ?? 'root'}-${node.id}-before-${pos}`));
      }

      if (hasChildren) {
        const disabled = invalidTargetIds.has(node.id);
        rendered.push(
          <div
            key={`folder-${node.id}`}
            className={cn(
              'mx-2 my-1 rounded-md border overflow-hidden bg-background',
              disabled ? 'opacity-40' : 'opacity-100',
            )}
            style={{ marginLeft: `${depth * 16 + 8}px` }}
            onDragOver={(e) => {
              if (dragKind !== 'item' || disabled) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              if (dragKind !== 'item' || disabled) return;
              e.preventDefault();
              const childrenWithoutMoving = (node.children ?? []).filter(c => !movingIds.has(c.id));
              submitDrop({ parentId: node.id, position: childrenWithoutMoving.length });
            }}
          >
            <button
              type="button"
              className={cn(
                'w-full flex items-center justify-between gap-2 px-2 py-2 text-left bg-muted/20 hover:bg-muted/30',
                isExpanded && 'border-b',
              )}
              onClick={() => toggleExpanded(node.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="text-muted-foreground">
                  {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
                </span>
                <span className="text-sm font-medium truncate">{node.title}</span>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{countLeaves(node)} items</span>
            </button>

            {isExpanded && (
              <div className="py-1">
                {renderNodes(node.children ?? [], node.id, depth + 1)}
              </div>
            )}
          </div>
        );
      } else {
        rendered.push(renderSlideCard(node, depth, parentId, pos + 1));
      }

      if (!isMoving) pos += 1;
    }

    rendered.push(renderInsertionPoint(parentId, pos, depth, `ins-${parentId ?? 'root'}-end-${pos}`));

    return rendered;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-6xl h-[90vh] min-h-0 flex flex-col"
        onMouseDownCapture={(e: React.MouseEvent<HTMLDivElement>) => {
          if (!contextMenu) return;
          const t = e.target as HTMLElement | null;
          if (t && t.closest('[data-subslide-menu]')) return;
          setContextMenu(null);
        }}
      >
        <DialogHeader>
          <DialogTitle>Reubicar: {title}</DialogTitle>
          <DialogDescription>
            Expande secciones/subsecciones para ver miniaturas. Arrastra la miniatura marcada como “Moviendo” y suéltala en otra sección/subsección/capítulo.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea
          ref={scrollAreaRef}
          className="flex-1 min-h-0 border rounded-md bg-background"
          onDragOverCapture={(e: React.DragEvent<HTMLDivElement>) => {
            if (!isDragging) return;
            dragPointerYRef.current = e.clientY;
          }}
        >
          <div className="p-2">
            {renderNodes(index, null, 0)}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-3">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>

        {contextMenu && (
          <div
            data-subslide-menu
            className="fixed z-50 min-w-[180px] rounded-md border bg-background shadow-md"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
              e.stopPropagation();
            }}
          >
            <div className="p-1">
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted"
                onClick={() => {
                  doCopy('copy', contextMenu.clickedParentId, contextMenu.clickedIndex);
                  setContextMenu(null);
                }}
              >
                Copiar
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted"
                onClick={() => {
                  doCopy('cut', contextMenu.clickedParentId, contextMenu.clickedIndex);
                  setContextMenu(null);
                }}
              >
                Cortar
              </button>
              <button
                type="button"
                className={cn(
                  'w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted',
                  (!subSlideClipboard || subSlideClipboard.htmls.length === 0) && 'opacity-50 pointer-events-none',
                )}
                onClick={() => {
                  doPaste(contextMenu.pasteParentId, contextMenu.pasteIndex);
                  setContextMenu(null);
                }}
              >
                Pegar
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted"
                onClick={() => {
                  setSelectedSubSlides(new Set());
                  setSubSlideAnchor(null);
                  setContextMenu(null);
                }}
              >
                Limpiar selección
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function findPath(items: IndexItem[], id: string): IndexItem[] | null {
  for (const item of items) {
    if (item.id === id) return [item];
    if (item.children && item.children.length > 0) {
      const childPath = findPath(item.children, id);
      if (childPath) return [item, ...childPath];
    }
  }
  return null;
}

function findItem(items: IndexItem[], id: string): IndexItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children && item.children.length > 0) {
      const found = findItem(item.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function countLeaves(item: IndexItem): number {
  if (!item.children || item.children.length === 0) return 1;
  return item.children.reduce((acc, c) => acc + countLeaves(c), 0);
}
