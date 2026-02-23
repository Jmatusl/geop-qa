"use client";

import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buscarEquipos } from "../actions";

export interface EquipmentSearchResult {
  id: string;
  name: string;
  systemId: string;
  systemName: string;
  areaId: string;
  areaName: string;
}

interface GlobalEquipmentSearchProps {
  onSelect: (equipment: EquipmentSearchResult) => void;
}

export function GlobalEquipmentSearch({ onSelect }: GlobalEquipmentSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EquipmentSearchResult[]>([]);

  // Simple debounce implementation inside component to avoid missing hook dependencies
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        setLoading(true);
        buscarEquipos(query).then((data) => {
          setResults(data);
          setLoading(false);
        });
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (equipment: EquipmentSearchResult) => {
    onSelect(equipment);
    setOpen(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-sm h-12 text-md transition-all rounded-lg group"
        >
          <Search className="mr-3 h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
          <span className="hidden sm:inline">Busca rápidamente un equipo por nombre o código...</span>
          <span className="sm:hidden">Buscar equipo...</span>
          <span className="ml-auto flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border font-mono">
            <span className="text-[10px]">Ctrl</span> + K
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Buscador Global de Equipos</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-4 pt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filtra por nombre de equipo, sistema o instalación..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
            {loading && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {!loading && query.length > 0 && query.length < 2 && <div className="text-center text-sm text-muted-foreground py-4">Escribe al menos 2 caracteres para buscar.</div>}

            {!loading && query.length >= 2 && results.length === 0 && <div className="text-center text-sm text-muted-foreground py-4">No se encontraron equipos para "{query}".</div>}

            {results.map((eq) => (
              <button key={eq.id} onClick={() => handleSelect(eq)} className="w-full text-left px-4 py-3 rounded-lg border hover:bg-muted/50 transition-colors flex flex-col items-start gap-1">
                <span className="font-medium">{eq.name}</span>
                <span className="text-xs text-muted-foreground">
                  Área: {eq.areaName} • Sistema: {eq.systemName}
                </span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
