"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { Upload, FileText, Maximize, Minimize, Sparkles, Edit, ChevronLeft, ChevronRight, PlusCircle, Move, Trash2 } from 'lucide-react';
import type { IndexItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { SlideIframe } from './slide-iframe';
// Note: avoid importing Genkit server flow directly in client to keep prod build lean.
import { Card, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppContext } from './app-context'; // Import the context hook

interface ViewerPanelProps {
  slide: IndexItem | null;
  onSave: (id: string, content: string[] | null) => void;
  onRelocate: (slideId: string) => void;
  onDelete: (slideId: string) => void;
  isPresentationMode: boolean;
  onNavigate: (slideId: string | null) => void;
  prevSlideId: string | null;
  nextSlideId: string | null;
}

export function ViewerPanel({ slide, onSave, onRelocate, onDelete, isPresentationMode, onNavigate, prevSlideId, nextSlideId }: ViewerPanelProps) {
  const [subSlideIndex, setSubSlideIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [isImproving, startImproving] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();
  const { togglePresentationMode } = useAppContext(); // Use the context to get the function
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const prevSlideIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentId = slide?.id ?? null;
    const prevId = prevSlideIdRef.current;
    // Reset sub-slide index on actual navigation to a new, valid slide id
    if (prevId !== currentId && currentId !== null) {
      try { console.log('[VIEWER] slide id changed', { prevId, currentId, action: 'resetSubSlideIndex' }); } catch {}
      setSubSlideIndex(0);
    }
    // Only exit edit mode when moving between two valid, different slide ids
    if (prevId !== null && currentId !== null && prevId !== currentId) {
      try { console.log('[VIEWER] exiting edit due to slide change', { prevId, currentId }); } catch {}
      setIsEditing(false);
    }
    // Initialize displayed content when not editing
    if (!isEditing) {
      const initial = slide?.content && slide.content.length > 0 ? (slide.content[0] || '') : '';
      try { console.log('[VIEWER] set initial htmlContent', { subSlideIndex: 0, hasContent: !!slide?.content?.length }); } catch {}
      setHtmlContent(initial);
    }
    prevSlideIdRef.current = currentId;
  }, [slide?.id, isEditing, slide]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d = e.data as any;
      if (d && d.__slideLog) {
        const lvl = (d.level || 'log') as 'log' | 'warn' | 'error';
        const args = Array.isArray(d.args) ? d.args : [d.args];
        // Ensure a single [SLIDE] prefix
        if (args.length > 0 && typeof args[0] === 'string') {
          const first = args[0] as string;
          if (!first.startsWith('[SLIDE]')) {
            args.unshift('[SLIDE]');
          }
        } else {
          args.unshift('[SLIDE]');
        }
        (console[lvl] || console.log).apply(console, args as any);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    // When slide content or sub-slide index changes, update the displayed content
    // but do not force exit from edit mode
    if (!isEditing) {
      const current = slide?.content && slide.content.length > 0
        ? (slide.content[subSlideIndex] || '')
        : '';
      try { console.log('[VIEWER] update htmlContent on deps change', { subSlideIndex, isEditing }); } catch {}
      setHtmlContent(current);
    }
  }, [slide, subSlideIndex, isEditing]);

  useEffect(() => {
    if (!isEditing || !slide) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const newContentArray = [...(slide.content || [])];
      if (newContentArray.length === 0) {
        newContentArray.push(htmlContent);
      } else {
        newContentArray[subSlideIndex] = htmlContent;
      }
      onSave(slide.id, newContentArray);
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [htmlContent, isEditing, slide, subSlideIndex, onSave]);

  const hasContent = slide?.content && slide.content.length > 0;
  const currentSlideContent = hasContent ? (slide.content?.[subSlideIndex] || '') : '';
  const totalSubSlides = hasContent ? slide.content!.length : 0;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if (!hasContent) return;
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
        const activeEl = document.activeElement;
        if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)) return;
        if (activeEl && (activeEl as HTMLElement).isContentEditable) return;

        let handled = false;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            if (isPresentationMode && subSlideIndex < totalSubSlides - 1) {
                setSubSlideIndex(i => i + 1);
                handled = true;
            } else if (isPresentationMode) {
                onNavigate(nextSlideId);
                handled = true;
            }
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            if (isPresentationMode && subSlideIndex > 0) {
                setSubSlideIndex(i => i - 1);
                handled = true;
            } else if (isPresentationMode) {
                onNavigate(prevSlideId);
                handled = true;
            }
        }

        if (handled) event.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresentationMode, hasContent, subSlideIndex, totalSubSlides, onNavigate, prevSlideId, nextSlideId]);

  const handleSave = useCallback(() => {
    if (!slide) return;
    const newContentArray = [...(slide.content || [])];
    if (newContentArray.length === 0) {
        newContentArray.push(htmlContent);
    } else {
        newContentArray[subSlideIndex] = htmlContent;
    }
    onSave(slide.id, newContentArray);
    // Manual save closes edit mode by design
    try { console.log('[VIEWER] manual save -> exit edit'); } catch {}
    setIsEditing(false);
    toast({ title: "Cambios guardados." });
  }, [slide, htmlContent, subSlideIndex, onSave, toast]);
  
  const handleAddNewSlide = useCallback(() => {
      if (!slide) return;
      const newContentArray = [...(slide.content || []), '<h1>Nueva Diapositiva</h1><p>Haz clic en "Editar" para empezar a añadir contenido.</p>'];
      onSave(slide.id, newContentArray);
      setSubSlideIndex(newContentArray.length - 1);
      setIsEditing(false);
      toast({ title: "Nueva diapositiva añadida." });
  }, [slide, onSave, toast]);

  const handleDeleteCurrentSubSlide = useCallback(() => {
      if (!slide || !hasContent) return;
      if (totalSubSlides <= 1) {
        const newContentArray: string[] = [];
        onSave(slide.id, newContentArray);
        setSubSlideIndex(0);
        setIsEditing(false);
        toast({ title: "Diapositiva eliminada." });
        return;
      }
      const newContentArray = [...(slide.content || [])];
      newContentArray.splice(subSlideIndex, 1);
      const newIndex = Math.max(0, Math.min(subSlideIndex, newContentArray.length - 1));
      setSubSlideIndex(newIndex);
      setIsEditing(false);
      onSave(slide.id, newContentArray);
      toast({ title: "Diapositiva eliminada." });
  }, [slide, hasContent, totalSubSlides, subSlideIndex, onSave, toast]);

  const handleImproveWithAI = useCallback(() => {
    const contentToImprove = isEditing ? htmlContent : currentSlideContent;
    if (!contentToImprove) {
      toast({ title: "No hay código para mejorar.", variant: "destructive" });
      return;
    }
    startImproving(async () => {
      try {
        const res = await fetch('/api/improve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ htmlContent: contentToImprove })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json() as { improvedHtml?: string };
        if (result && result.improvedHtml) {
          setHtmlContent(result.improvedHtml);
          setIsEditing(true);
          toast({ title: "Contenido mejorado con IA.", description: "Revisa los cambios y guarda." });
        } else {
          throw new Error("La respuesta de la IA no contiene HTML.");
        }
      } catch (error) {
        console.error("Error al mejorar con IA:", error);
        toast({ title: "Error de IA", description: (error as Error).message, variant: "destructive" });
      }
    });
  }, [htmlContent, currentSlideContent, isEditing, toast]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/html") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target?.result as string;
        if (slide) {
          const newContentArray = [...(slide.content || []), fileContent];
          onSave(slide.id, newContentArray);
          setSubSlideIndex(newContentArray.length - 1);
          setIsEditing(false);
          toast({ title: "Diapositiva importada con éxito." });
        }
      };
      reader.readAsText(file);
    } else {
      toast({ title: "Por favor, selecciona un archivo HTML válido.", variant: "destructive" });
    }
    if(event.target) event.target.value = '';
  }, [slide, onSave, toast]);

  if (!slide) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center p-8">
        <div className="text-center">
          <FileText size={64} className="mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold text-foreground">Bienvenido al Visor de Presentaciones</h2>
          <p className="mt-2 text-muted-foreground">Selecciona un tema del índice de la izquierda para comenzar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background flex flex-col h-full relative">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".html" className="hidden" />
      {!isPresentationMode && (
          <header className="bg-card p-2 flex items-center justify-between text-foreground border-b border-border shrink-0">
            <h2 className="font-bold text-lg truncate px-2">{slide.title}</h2>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm"><PlusCircle /> Añadir</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleAddNewSlide}>Añadir diapositiva en blanco</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>Subir archivo (.html)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {hasContent && !isEditing && <Button onClick={() => setIsEditing(true)} size="sm"><Edit /> Editar</Button>}
              {hasContent && <Button onClick={() => onRelocate(slide.id)} variant="outline" size="sm"><Move /> Reubicar</Button>}
              {hasContent && <Button onClick={() => onDelete(slide.id)} variant="destructive" size="sm" title="Eliminar diapositiva"><Trash2 /> Eliminar</Button>}
              <Button onClick={togglePresentationMode} variant="ghost" size="icon" disabled={!hasContent} title="Modo presentación">
                <Maximize size={18} />
              </Button>
            </div>
          </header>
      )}

      <main className="flex-1 overflow-y-auto">
        {isEditing ? (
          <div className="p-4 h-full flex flex-col gap-4">
            <Textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} placeholder="Pega aquí el código HTML..." className="w-full flex-1 font-code text-sm" />
            <div className="flex justify-between items-center">
               <Button onClick={handleImproveWithAI} className="bg-purple-600 hover:bg-purple-500 text-white" disabled={isImproving}>
                 {isImproving ? "Mejorando..." : <><Sparkles size={16} /> Mejorar con IA</>}
               </Button>
              <div className="flex gap-2">
                <Button onClick={() => setIsEditing(false)} variant="secondary">Cancelar</Button>
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white">Guardar</Button>
              </div>
            </div>
          </div>
        ) : hasContent ? (
          <SlideIframe ref={iframeRef} content={currentSlideContent} title={slide.title} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
            <Card className="max-w-lg w-full">
              <CardContent className="pt-6 text-center">
                  <Upload size={48} className="mb-4 text-muted-foreground mx-auto" />
                  <h3 className="text-xl font-semibold text-foreground">Sin contenido</h3>
                  <p className="mt-2 mb-6">Puedes pegar código HTML o subir un archivo.</p>
                  <div className="flex gap-4 justify-center">
                    <Button onClick={() => setIsEditing(true)} size="lg">Pegar Código</Button>
                    <Button onClick={() => fileInputRef.current?.click()} variant="secondary" size="lg">Subir Archivo</Button>
                  </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {!isEditing && !isPresentationMode && hasContent && totalSubSlides > 0 && (
        <footer className="bg-card p-2 flex items-center justify-center gap-4 text-foreground border-t">
          <Button onClick={() => setSubSlideIndex(i => i - 1)} disabled={subSlideIndex === 0} variant="outline" size="sm">Anterior</Button>
          <span>{subSlideIndex + 1} / {totalSubSlides}</span>
          <Button onClick={() => setSubSlideIndex(i => i + 1)} disabled={subSlideIndex >= totalSubSlides - 1} size="sm">Siguiente</Button>
          <Button onClick={handleDeleteCurrentSubSlide} variant="destructive" size="sm">Eliminar diapositiva actual</Button>
        </footer>
      )}
      
      {isPresentationMode && (
         <Button
            onClick={togglePresentationMode}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-20 bg-background/50 hover:bg-background/80 rounded-full"
            title="Salir del modo presentación"
        >
            <Minimize size={24} />
        </Button>
      )}

      {(!isEditing || isPresentationMode) && hasContent && (
        <>
          <Button variant="outline" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full z-10" onClick={() => onNavigate(prevSlideId)} disabled={!prevSlideId}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full z-10" onClick={() => onNavigate(nextSlideId)} disabled={!nextSlideId}>
            <ChevronRight />
          </Button>
        </>
      )}
    </div>
  );
}
