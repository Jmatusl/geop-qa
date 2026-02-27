"use client";

import React from "react";
import { ArrowLeft, Edit, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Props {
  mode: "create" | "edit" | "view";
  subtitle?: string;
  onBack?: () => void;
  isSubmitting?: boolean;
  itemsCount?: number;
  fechaEstimadaEntrega?: Date | string | undefined;
  areaName?: string;
}

export default function SolicitudFormHeader({ mode, subtitle, onBack, isSubmitting = false, itemsCount, fechaEstimadaEntrega, areaName }: Props) {
  const router = useRouter();
  let title = "";
  if (mode === "create") title = "Crear Solicitud de Insumos";
  else if (mode === "edit") title = "Editar Solicitud de Insumos";
  else title = "Visualizar Solicitud de Insumos";

  let badgeVariant: "default" | "secondary" | "outline" = "secondary";
  let badgeClass: string = "";
  if (isSubmitting) {
    badgeVariant = "default";
    badgeClass =
      mode === "create"
        ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500"
        : mode === "edit"
          ? "bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500"
          : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500";
  } else {
    badgeVariant = mode === "create" ? "secondary" : "outline";
    badgeClass =
      mode === "create"
        ? "bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-slate-100"
        : mode === "edit"
          ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-400"
          : "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-900/50 dark:text-blue-400";
  }

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-4">
        {mode !== "view" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (onBack) return onBack();
              try {
                router.back();
              } catch (e) {
                // fallback: no-op
              }
            }}
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
            <Badge variant={badgeVariant} className={cn("text-sm", badgeClass)}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-1">{mode === "create" ? "Creando…" : mode === "edit" ? "Guardando…" : "Visualizando…"}</span>
              ) : mode === "create" ? (
                <span className="inline-flex items-center gap-1">
                  <PlusCircle className="h-4 w-4" /> Nuevo
                </span>
              ) : mode === "edit" ? (
                <span className="inline-flex items-center gap-1">
                  <Edit className="h-4 w-4" /> Editando
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Edit className="h-4 w-4" /> Visualizando
                </span>
              )}
            </Badge>

            {/* Items count pill */}
            {typeof itemsCount === "number" && <span className="text-xs rounded bg-muted px-2 py-0.5">{itemsCount} ítems</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
