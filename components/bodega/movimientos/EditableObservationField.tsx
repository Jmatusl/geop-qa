"use client";

import { useState, useEffect } from "react";
import { PenLine, Check, X, Loader2, FileText, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface EditableObservationFieldProps {
  movementId: string;
  field: "cotizacion" | "guia" | "docRef";
  label: string;
  initialValue: string | null;
}

export function EditableObservationField({ movementId, field, label, initialValue }: EditableObservationFieldProps) {
  const [value, setValue] = useState(initialValue || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-1 relative group">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
          <div className="flex items-center gap-1.5">
            {field === "docRef" ? <FileSearch className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            {label}
          </div>
          <div className="h-4 w-4" /> {/* Placeholder for the pen button */}
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
          {initialValue || "N/A"}
        </div>
      </div>
    );
  }

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/v1/bodega/movimientos/${movementId}/observations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar");
      }

      toast.success(`${label} actualizado correctamente`);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : "No se pudo actualizar"}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-1 relative group">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
        <div className="flex items-center gap-1.5">
          {field === "docRef" ? <FileSearch className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
          {label}
        </div>

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-4 w-4 p-0 opacity-40 group-hover:opacity-100 transition-opacity hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600">
              <PenLine className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 border-slate-200 dark:border-slate-800 shadow-xl" align="end">
            <div className="space-y-3">
              <div className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <PenLine className="h-3 w-3" />
                Editar {label}
              </div>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`Ingrese ${label}`}
                className="h-8 text-xs font-bold focus-visible:ring-blue-600"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdate();
                  if (e.key === "Escape") setIsOpen(false);
                }}
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[10px] font-bold uppercase"
                  onClick={() => {
                    setValue(initialValue || "");
                    setIsOpen(false);
                  }}
                  disabled={isUpdating}
                >
                  <X className="h-3 w-3 mr-1" /> Cancelar
                </Button>
                <Button size="sm" className="h-7 px-2 text-[10px] font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white border-none" onClick={handleUpdate} disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                  Guardar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
        {initialValue || "N/A"}
      </div>
    </div>
  );
}
