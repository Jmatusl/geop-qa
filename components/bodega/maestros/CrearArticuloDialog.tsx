"use client";

/**
 * COMPONENTE - DIÁLOGO DE CREACIÓN RÁPIDA DE ARTÍCULOS
 *
 * Reutilizable desde cualquier parte del módulo bodega
 * (formulario de ingreso, retiro, movimiento, etc.)
 *
 * REUTILIZA: ArticleForm de components/bodega/article-form.tsx
 */

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArticleForm } from "@/components/bodega/article-form";
import type { BodegaArticle } from "@/lib/hooks/bodega/use-bodega-articles";

interface CrearArticuloDialogProps {
  onArticuloCreado?: (articulo?: BodegaArticle) => void;
  className?: string;
  trigger?: React.ReactNode;
  initialValues?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CrearArticuloDialog({ onArticuloCreado, className, trigger, initialValues, open: openControlled, onOpenChange: onOpenChangeControlled }: CrearArticuloDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = openControlled !== undefined;
  const open = isControlled ? openControlled : internalOpen;
  const setOpen = isControlled ? onOpenChangeControlled! : setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button type="button" variant="outline" className={className}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Artículo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="p-0 border-none shadow-none w-full max-w-full h-full max-h-full sm:w-[90vw] sm:max-w-4xl sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col rounded-none sm:rounded-2xl"
        onPointerDownOutside={(e) => e.preventDefault()} // Evita cierre por clic fuera
        onEscapeKeyDown={(e) => e.preventDefault()} // Evita cierre por tecla Escape
      >
        <DialogHeader className="p-4 border-b bg-white dark:bg-slate-950 sticky top-0 z-10 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm font-black uppercase tracking-widest text-[#283c7f] dark:text-blue-400">{initialValues ? "Clonar Artículo" : "Crear Nuevo Artículo"}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30 dark:bg-slate-900/10">
          <ArticleForm
            initialData={initialValues}
            inDialog
            onSuccess={(articulo) => {
              setOpen(false);
              onArticuloCreado?.(articulo);
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
