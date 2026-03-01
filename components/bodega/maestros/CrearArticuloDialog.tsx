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
import { Plus } from "lucide-react";
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
      <DialogContent className="w-[80vw]! max-w-[80vw]! max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialValues ? "Clonar Artículo" : "Crear Nuevo Artículo"}</DialogTitle>
        </DialogHeader>

        {/* Modo Dialog: ArticleForm con onSuccess (mutaciones internas) + botones inline */}
        <ArticleForm
          initialData={initialValues}
          inDialog
          onSuccess={(articulo) => {
            setOpen(false);
            onArticuloCreado?.(articulo);
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
