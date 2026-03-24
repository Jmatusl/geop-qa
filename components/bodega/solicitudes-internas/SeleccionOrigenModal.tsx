"use client";

/**
 * COMPONENTE: SeleccionOrigenModal
 * PROPÓSITO: Permite al usuario seleccionar de qué ingreso (bucket FIFO) descontar el stock
 * al registrar un retiro. Réplica funcional del sistema legacy adaptada a UUIDs.
 */

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Calendar, X, Zap, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useBodegaAvailableBuckets, type BodegaAvailableBucket } from "@/lib/hooks/bodega/use-bodega-available-buckets";
import { useBodegaQuickSearch } from "@/lib/hooks/bodega/use-bodega-quick-search";
import { cn } from "@/lib/utils";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface BucketDisponible extends BodegaAvailableBucket {}

export interface OrigenSeleccionado {
  id: string; // BodegaStockMovementItem.id
  saldo: number;
  docRef: string | null;
  cantidad: number;
  numeroMovimiento: string;
  fecha: string;
  precioUnitario: number | null;
}

interface SeleccionOrigenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleId: string;
  warehouseId: string;
  cantidadRequerida: number;
  onSelect: (origenes: OrigenSeleccionado[] | null) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(amount: number | null): string {
  if (amount === null) return "-";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount);
}

// ── Componente ────────────────────────────────────────────────────────────────

export function SeleccionOrigenModal({ open, onOpenChange, articleId, warehouseId, cantidadRequerida, onSelect }: SeleccionOrigenModalProps) {
  // Map: id del bucket → cantidad a tomar
  const [seleccionados, setSeleccionados] = useState<Map<string, number>>(new Map());

  // Bodega efectiva usada para la consulta (puede diferir de la asignada al ítem si no tiene stock)
  const [bodegaEfectivaId, setBodegaEfectivaId] = useState<string>(warehouseId);
  const [bodegaEfectivaNombre, setBodegaEfectivaNombre] = useState<string | null>(null);
  const [usandoBodegaAlternativa, setUsandoBodegaAlternativa] = useState(false);

  const { data: quickSearchData } = useBodegaQuickSearch("", undefined, {
    enabled: open && !!articleId,
    articleId,
  });

  const articuloQuickSearch = quickSearchData?.resultados?.find((result) => result.id === articleId);
  const {
    data: ingresosData = [],
    isLoading: cargandoIngresos,
    isFetching: actualizandoIngresos,
    error: ingresosError,
  } = useBodegaAvailableBuckets(bodegaEfectivaId, articleId, {
    enabled: open && !!articleId && !!bodegaEfectivaId,
  });
  const ingresos = ingresosData as BucketDisponible[];

  // Cargar buckets al abrir — resetear bodega efectiva si cambian los props
  useEffect(() => {
    if (open && articleId && warehouseId) {
      setBodegaEfectivaId(warehouseId);
      setBodegaEfectivaNombre(null);
      setUsandoBodegaAlternativa(false);
    }
  }, [open, articleId, warehouseId, articuloQuickSearch]);

  useEffect(() => {
    if (!open || !articleId || !warehouseId) return;
    if (bodegaEfectivaId !== warehouseId) return;
    if (cargandoIngresos || actualizandoIngresos) return;
    if (ingresos.length > 0) return;

    const bodegaAlt = articuloQuickSearch?.bodegas?.find((bodega) => bodega.cantidadDisponible >= (cantidadRequerida > 0 ? cantidadRequerida : 1));
    if (!bodegaAlt || bodegaAlt.bodegaId === warehouseId) return;

    setBodegaEfectivaId(bodegaAlt.bodegaId);
    setBodegaEfectivaNombre(bodegaAlt.bodegaNombre);
    setUsandoBodegaAlternativa(true);
  }, [
    open,
    articleId,
    warehouseId,
    bodegaEfectivaId,
    articuloQuickSearch,
    cantidadRequerida,
    ingresos,
    cargandoIngresos,
    actualizandoIngresos,
  ]);

  useEffect(() => {
    if (!open) return;

    if (cantidadRequerida > 0 && ingresos.length > 0) {
      let restante = cantidadRequerida;
      const nuevaSeleccion = new Map<string, number>();
      for (const ing of ingresos) {
        if (restante <= 0) break;
        const aTomar = Math.min(restante, ing.saldo);
        nuevaSeleccion.set(ing.id, aTomar);
        restante -= aTomar;
      }
      setSeleccionados(nuevaSeleccion);
      return;
    }

    setSeleccionados(new Map());
  }, [open, cantidadRequerida, ingresos, bodegaEfectivaId]);

  const toggleSeleccion = (ing: BucketDisponible) => {
    const nueva = new Map(seleccionados);
    if (nueva.has(ing.id)) {
      nueva.delete(ing.id);
    } else {
      const totalActual = Array.from(nueva.values()).reduce((a, b) => a + b, 0);
      const falta = Math.max(0, cantidadRequerida - totalActual);
      nueva.set(ing.id, Math.min(ing.saldo, falta || ing.saldo));
    }
    setSeleccionados(nueva);
  };

  const handleCantidadChange = (id: string, cant: number, max: number) => {
    const nueva = new Map(seleccionados);
    if (cant <= 0) {
      nueva.delete(id);
    } else {
      nueva.set(id, Math.min(cant, max));
    }
    setSeleccionados(nueva);
  };

  const buildResultConBodega = (map: Map<string, number>): OrigenSeleccionado[] => {
    return Array.from(map.entries()).map(([id, cant]) => {
      const ing = ingresos.find((i) => i.id === id)!;
      return {
        id,
        cantidad: cant,
        saldo: ing.saldo,
        docRef: ing.documentoReferencia,
        numeroMovimiento: ing.numeroMovimiento,
        fecha: ing.fecha,
        precioUnitario: ing.precioUnitario,
        // Si se usó bodega alternativa, pasarla al caller para que el retiro aplique ahí
        bodegaEfectivaId: usandoBodegaAlternativa ? bodegaEfectivaId : undefined,
      } as any;
    });
  };

  const handleConfirmar = () => {
    const data = buildResultConBodega(seleccionados);
    onSelect(data.length > 0 ? data : null);
    onOpenChange(false);
  };

  const handleAuto = () => {
    // Recalcular FIFO puro y confirmar directamente
    let restante = cantidadRequerida;
    const fifoMap = new Map<string, number>();
    for (const ing of ingresos) {
      if (restante <= 0) break;
      const aTomar = Math.min(restante, ing.saldo);
      fifoMap.set(ing.id, aTomar);
      restante -= aTomar;
    }
    const data = buildResultConBodega(fifoMap);
    onSelect(data.length > 0 ? data : null);
    onOpenChange(false);
  };

  const totalSeleccionado = Array.from(seleccionados.values()).reduce((a, b) => a + b, 0);
  const faltaParaCompletar = Math.max(0, cantidadRequerida - totalSeleccionado);
  const estaCompleto = faltaParaCompletar === 0 && totalSeleccionado > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-2xl w-[80vw]! max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-base font-black">Seleccionar Origen</DialogTitle>
          <DialogDescription className="text-xs">
            {usandoBodegaAlternativa && bodegaEfectivaNombre ? (
              <span className="text-amber-600 font-bold">
                ⚠ La bodega asignada no tiene stock. Mostrando buckets de <strong>{bodegaEfectivaNombre}</strong> donde sí hay disponibilidad.
              </span>
            ) : (
              "Elija de qué ingreso descontar el stock."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {cargandoIngresos || actualizandoIngresos ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : ingresosError ? (
            <div className="p-8 text-center text-destructive text-sm">No se pudieron cargar los datos de trazabilidad.</div>
          ) : ingresos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No hay ingresos con saldo disponible para este artículo y bodega.</div>
          ) : (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {/* Resumen de cantidad */}
                {cantidadRequerida > 0 && (
                  <div
                    className={cn(
                      "p-3 rounded-lg border flex items-center justify-between",
                      estaCompleto ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={cn("h-4 w-4", estaCompleto ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")} />
                      <span className="text-sm font-medium">{estaCompleto ? "Cantidad completada" : `Faltan ${faltaParaCompletar} unidades de ${cantidadRequerida}`}</span>
                    </div>
                    <Badge variant="outline" className="font-bold border-slate-300 dark:border-slate-700">
                      {totalSeleccionado} / {cantidadRequerida}
                    </Badge>
                  </div>
                )}

                {/* Lista de buckets */}
                {ingresos.map((ingreso) => {
                  const isSelected = seleccionados.has(ingreso.id);
                  const cantTomada = seleccionados.get(ingreso.id) ?? 0;

                  return (
                    <div
                      key={ingreso.id}
                      className={cn(
                        "flex flex-col border rounded-lg p-3 transition-all",
                        isSelected ? "border-[#283c7f] bg-blue-50/30 dark:bg-blue-900/20 ring-1 ring-[#283c7f]/20" : "hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800",
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 flex-1 flex-wrap">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-[#283c7f] focus:ring-[#283c7f] cursor-pointer bg-white dark:bg-slate-950"
                            checked={isSelected}
                            onChange={() => toggleSeleccion(ingreso)}
                          />
                          <Badge variant="outline" className="font-normal bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 text-xs">
                            {ingreso.numeroMovimiento}
                          </Badge>
                          {ingreso.documentoReferencia && (
                            <Badge className="font-extrabold bg-[#283c7f] text-white border-[#1e2e6b] px-3 py-1 shadow-sm text-xs">REF: {ingreso.documentoReferencia}</Badge>
                          )}
                        </div>
                        <Badge
                          className={cn(
                            "text-xs",
                            ingreso.saldo >= (cantidadRequerida || 0)
                              ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800"
                              : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800",
                          )}
                        >
                          Disp: {ingreso.saldo}
                        </Badge>
                      </div>

                      <div className="flex items-end justify-between gap-4 mt-1">
                        <div className="grid grid-cols-1 gap-1 text-sm text-muted-foreground flex-1">
                          <div className="flex items-center gap-1 text-xs">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(ingreso.fecha), "dd/MM/yyyy", { locale: es })}
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <span className="font-medium text-foreground">Precio:</span> {formatCurrency(ingreso.precioUnitario)}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] uppercase font-bold text-[#283c7f] dark:text-blue-400">CANTIDAD A TOMAR:</span>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                className="h-8 w-20 text-right font-bold bg-white dark:bg-slate-950 text-sm"
                                value={cantTomada}
                                onChange={(e) => handleCantidadChange(ingreso.id, Number(e.target.value), ingreso.saldo)}
                                min={1}
                                max={ingreso.saldo}
                              />
                              <span className="text-xs text-muted-foreground">/ {ingreso.saldo}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button variant="secondary" size="sm" onClick={handleAuto} disabled={cargandoIngresos || actualizandoIngresos || ingresos.length === 0} className="text-[#283c7f] dark:text-blue-300 font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Usar Automático (FIFO)
            </Button>
          </div>

          <Button variant="default" size="sm" onClick={handleConfirmar} disabled={totalSeleccionado === 0} className="bg-[#283c7f] hover:bg-[#1e2e6b] text-white flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-white" />
            Confirmar Selección ({totalSeleccionado})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
