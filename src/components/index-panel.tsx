"use client";

import React, { useMemo, useState, useRef } from 'react';
import { BookOpen, Search, Download, Upload, X, RefreshCw } from 'lucide-react';
import type { IndexItem as IndexItemType } from '@/lib/types';
import { IndexItem } from './index-item';
import { SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import { useToast } from '@/hooks/use-toast';

interface IndexPanelProps {
  data: IndexItemType[];
  activeSlideId: string | null;
  selectedIds: Set<string>;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onIndexChange: (newIndex: IndexItemType[]) => void;
  onMove: (dragId: string, dropId: string) => void;
}

export function IndexPanel({ data, activeSlideId, selectedIds, onSelect, onIndexChange, onMove }: IndexPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const lowerQuery = searchQuery.toLowerCase();
    
    function filter(nodes: IndexItemType[]): IndexItemType[] {
        return nodes.reduce<IndexItemType[]>((acc, node) => {
            const match = node.title.toLowerCase().includes(lowerQuery);
            const filteredChildren = node.children ? filter(node.children) : [];
            
            if (match || filteredChildren.length > 0) {
                acc.push({
                    ...node,
                    children: filteredChildren.length > 0 ? filteredChildren : (match ? node.children : undefined)
                });
            }
            return acc;
        }, []);
    }
    return filter(data);
  }, [data, searchQuery]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdi-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Copia de seguridad descargada" });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            onIndexChange(parsed);
            toast({ title: "Backup restaurado correctamente" });
        } else {
            throw new Error("Formato inválido");
        }
      } catch (error) {
        console.error(error);
        toast({ title: "Error al importar backup", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  return (
    <>
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="text-primary h-6 w-6" />
            <span>PDI Visor</span>
            </h1>
            <ThemeToggle />
        </div>
        <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Buscar temas..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
            />
            {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="p-2">
          {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <IndexItem
                  key={item.id}
                  item={item}
                  level={0}
                  activeSlideId={activeSlideId}
                  selectedIds={selectedIds}
                  onSelect={onSelect}
                  onMove={onMove}
                />
              ))
          ) : (
              <div className="text-center text-muted-foreground p-4 text-sm">
                  No se encontraron resultados.
              </div>
          )}
        </div>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <div className="grid grid-cols-2 gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={handleExport} title="Exportar copia de seguridad">
                <Download className="mr-2 h-3 w-3" /> Backup
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} title="Restaurar copia de seguridad">
                <Upload className="mr-2 h-3 w-3" /> Restaurar
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
        </div>
        <Button variant="ghost" size="sm" className="w-full mb-2" onClick={() => window.location.reload()} title="Recargar datos desde DB">
            <RefreshCw className="mr-2 h-3 w-3" /> Sincronizar Datos
        </Button>
        <div className="text-xs text-muted-foreground text-center">
          <p>Visor v1.14 · Oppenheim</p>
        </div>
      </SidebarFooter>
    </>
  );
}
