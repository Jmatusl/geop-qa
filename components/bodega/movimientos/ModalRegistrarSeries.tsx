"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hash, Save, ShieldAlert, Info, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBodegaSeries } from "@/lib/hooks/bodega/use-bodega-series";
import { useBodegaAuth } from "@/lib/hooks/bodega/use-bodega-auth";
import { useBodegaConfig } from "@/lib/hooks/bodega/use-bodega-config";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cantidad: number;
  initialValues?: string; // Comma-separated
  onSave: (series: string) => void;
  onBypassChange?: (bypass: boolean) => void;
  onJustificacionChange?: (justificacion: string) => void;
  itemName: string;
  articleId?: string; // Cambiado por nomenclature V1 (repuestoId -> articleId)
  warehouseId?: string; // Cambiado por nomenclature V1 (bodegaId -> warehouseId)
}

export default function ModalRegistrarSeries({ open, onOpenChange, cantidad, initialValues = "", onSave, onBypassChange, onJustificacionChange, itemName, articleId, warehouseId }: Props) {
  const [series, setSeries] = useState<string[]>([]);
  const [bypassSeries, setBypassSeries] = useState(false);
  const [justificacion, setJustificacion] = useState("");
  const { isBodegaAdmin } = useBodegaAuth();
  const { data: config } = useBodegaConfig();

  const generalConfig = config?.["BODEGA_GENERAL_CONFIG"];
  const canBypass = isBodegaAdmin && (generalConfig as any)?.permitir_bypass_series === true;

  const { data: availableSeriesData, isLoading: isLoadingAvailable } = useBodegaSeries({
    page: 1,
    pageSize: 100, // limit
    search: "", // search
    warehouseId: warehouseId,
    status: "DISPONIBLE",
    articleId: articleId,
  });

  const availableSeries = availableSeriesData?.data || [];

  const handleBypassToggle = (val: boolean) => {
    setBypassSeries(val);
    if (onBypassChange) onBypassChange(val);
  };

  const handleJustificacionChange = (val: string) => {
    setJustificacion(val);
    if (onJustificacionChange) onJustificacionChange(val);
  };

  useEffect(() => {
    if (open) {
      const initial = initialValues.split(",").map((s) => s.trim());
      const newSeries = Array(cantidad).fill("");
      initial.forEach((val, i) => {
        if (i < cantidad) newSeries[i] = val;
      });
      setSeries(newSeries);
    }
  }, [open, cantidad, initialValues]);

  const handleInputChange = (index: number, value: string) => {
    const nextSeries = [...series];
    nextSeries[index] = value;
    setSeries(nextSeries);
  };

  const handleSave = () => {
    // Si activa bypass pero no ingresa la justificación
    if (bypassSeries && !justificacion.trim()) {
      return;
    }

    // Filtrar los valores vaciados
    const result = series
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .join(", ");

    onSave(result);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#284893]">
            <Hash className="h-5 w-5" />
            Números de Serie
          </DialogTitle>
          <DialogDescription>
            Ingrese los números de serie para las {cantidad} unidades de <strong>{itemName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4 py-4">
            {/* Bypass Administrativo */}
            {canBypass && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-200">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <div className="flex-1">
                  <Label htmlFor="bypass-modal" className="text-xs font-semibold text-amber-800 cursor-pointer">
                    Bypass Administrativo
                  </Label>
                  <p className="text-[10px] text-amber-600">Permite ingreso manual no validado</p>
                </div>
                <Switch id="bypass-modal" checked={bypassSeries} onCheckedChange={handleBypassToggle} className="data-[state=checked]:bg-amber-600" />
              </div>
            )}

            {bypassSeries && (
              <div className="space-y-1.5 p-2 bg-amber-50/50 border border-amber-200 rounded-md animate-in fade-in slide-in-from-top-1">
                <Label className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Justificación Obligatoria *
                </Label>
                <Textarea
                  placeholder="Por qué se omite el registro de series..."
                  className="text-xs border-amber-200 focus-visible:ring-amber-500 bg-white"
                  value={justificacion}
                  onChange={(e) => handleJustificacionChange(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {/* Información de disponibilidad */}
            {!isLoadingAvailable && !bypassSeries && (
              <div className="bg-blue-50 border border-blue-100 p-2 rounded flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5" />
                <p className="text-[11px] text-blue-700">
                  Seleccione {cantidad} unidades de las {availableSeries.length} disponibles en esta bodega.
                </p>
              </div>
            )}

            {series.map((val, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-2 border rounded-md bg-slate-50">
                <Label htmlFor={`serie-${idx}`} className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                  Unidad {idx + 1}
                </Label>

                {bypassSeries ? (
                  <Input id={`serie-${idx}`} placeholder="Ingrese serie manualmente..." value={val} onChange={(e) => handleInputChange(idx, e.target.value)} className="h-9 text-sm" />
                ) : (
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={val}
                    onChange={(e) => handleInputChange(idx, e.target.value)}
                  >
                    <option value="">Seleccione una serie...</option>
                    {availableSeries.map((s: any) => (
                      <option key={s.id} value={s.serialNumber} disabled={series.includes(s.serialNumber) && val !== s.serialNumber}>
                        {s.serialNumber} {s.notes ? `(${s.notes})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}

            {!bypassSeries && availableSeries.length < cantidad && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-md flex items-center gap-2 text-red-700 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p>
                  No hay suficientes números de serie disponibles en esta bodega ({availableSeries.length} disponibles, necesita {cantidad}). Contacte al administrador.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-[#284893] hover:bg-[#1e3a7a]" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Guardar Series
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
