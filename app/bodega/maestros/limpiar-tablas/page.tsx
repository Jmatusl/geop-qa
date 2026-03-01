"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function BodegaLimpiarTablasPage() {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  const handleClean = async () => {
    if (!confirm) {
      toast.error("Debes confirmar la operación para continuar");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/v1/bodega/maestros/limpiar-tablas", {
      method: "POST",
    });
    const json = await response.json();

    if (!response.ok || !json.success) {
      toast.error(json.error || "No fue posible limpiar las tablas");
      setIsSubmitting(false);
      return;
    }

    toast.success("Limpieza completada correctamente");
    setIsSubmitting(false);
    setConfirm(false);
  };

  return (
    <div className="w-full space-y-6 pb-24 lg:pb-0">
      <div className="border-b border-border bg-white dark:bg-slate-900 lg:hidden">
        <div className="flex items-center justify-between py-3">
          <Button type="button" variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl dark:text-white">
            <span className="sr-only">Volver</span>
            ←
          </Button>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <h1 className="text-sm font-extrabold uppercase tracking-wide">Limpiar Tablas</h1>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">{today}</span>
        </div>
      </div>

      <div className="hidden lg:block">
        <h1 className="text-2xl font-bold tracking-tight">Limpiar Tablas de Bodega</h1>
        <p className="mt-1 text-sm text-muted-foreground">Elimina datos transaccionales para reiniciar operación del módulo.</p>
      </div>

      <Card className="rounded-xl border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Zona de Riesgo
          </CardTitle>
          <CardDescription>Esta acción es irreversible y borra movimientos, stock, solicitudes, lotes y reservas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              <Checkbox id="confirm-clean" checked={confirm} onCheckedChange={(value) => setConfirm(Boolean(value))} />
              <Label htmlFor="confirm-clean" className="text-sm leading-6">
                Entiendo que esta operación eliminará toda la trazabilidad de bodega y no puede deshacerse.
              </Label>
            </div>
          </div>

          <div className="hidden flex-wrap gap-2 lg:flex">
            <Button variant="destructive" onClick={handleClean} disabled={!confirm || isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Limpiar Tablas
            </Button>
            <Button asChild variant="outline">
              <Link href="/bodega/maestros">Volver a Maestros</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-white p-4 shadow-lg dark:bg-slate-900 lg:hidden">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className="shrink-0" onClick={() => router.back()}>
            Volver
          </Button>
          <Button variant="destructive" onClick={handleClean} disabled={!confirm || isSubmitting} className="flex-1">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Limpiar
          </Button>
        </div>
      </div>
    </div>
  );
}
