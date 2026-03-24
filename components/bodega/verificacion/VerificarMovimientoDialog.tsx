"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PackageCheck, Zap, X, Loader2, ArrowRight } from "lucide-react";
import { useCompleteBodegaMovement, useApplyBodegaMovement } from "@/lib/hooks/bodega/use-bodega-verification";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ItemEvidence {
  id: string;
  url: string;
}

interface ItemData {
  id: string; // movementItemId
  quantity: number;
  observations: string;
  evidence: ItemEvidence[];
}

interface VerificarMovimientoDialogProps {
  movement: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "EJECUTAR" | "VERIFICAR";
  isTransit?: boolean;
  warehouses?: any[];
}

export function VerificarMovimientoDialog({ movement, open, onOpenChange, mode = "VERIFICAR", isTransit = false, warehouses = [] }: VerificarMovimientoDialogProps) {
  const [itemsData, setItemsData] = useState<ItemData[]>([]);
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const completeMovement = useCompleteBodegaMovement();
  const applyMovement = useApplyBodegaMovement();

  const isExecution = mode === "EJECUTAR";

  // Inicializar estados al abrir con un movimiento nuevo
  useEffect(() => {
    if (open && movement && movement.items) {
      setItemsData(
        movement.items.map((item: any) => ({
          id: item.id,
          quantity: 0,
          observations: item.observations || "",
          evidence: (item.evidences || []).map((ev: any) => ({
            id: ev.id,
            url: ev.url,
          })),
        })),
      );
      setDestinationWarehouseId("");
    }
  }, [open, movement]);

  const handleAutocomplete = () => {
    if (!movement) return;
    setItemsData((prev) =>
      movement.items.map((item: any) => {
        const existing = prev.find((it) => it.id === item.id);
        return {
          id: item.id,
          quantity: Number(item.quantity),
          observations: existing?.observations || "",
          evidence:
            existing?.evidence ||
            (item.evidences || []).map((ev: any) => ({
              id: ev.id,
              url: ev.url,
            })),
        };
      }),
    );
  };

  const handleCantidadChange = (id: string, value: string) => {
    const val = Number(value) || 0;
    setItemsData((prev) => prev.map((it) => (it.id === id ? { ...it, quantity: val } : it)));
  };

  const handleObsChange = (id: string, value: string) => {
    setItemsData((prev) => prev.map((it) => (it.id === id ? { ...it, observations: value } : it)));
  };

  const handleUploadPhoto = async (itemId: string, file: File) => {
    setUploadingMap((prev) => ({ ...prev, [itemId]: true }));
    const toastId = toast.loading("Subiendo imagen...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", "bodega/evidencias");

      const res = await fetch("/api/v1/storage/r2-simple", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Error al subir imagen");
      const data = await res.json();
      const url = data.data?.url || data.url;

      // Persistir en Base de Datos automáticamente como pidió el usuario
      const dbRes = await fetch(`/api/v1/bodega/movimientos/items/${itemId}/evidencia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!dbRes.ok) throw new Error("Error al registrar evidencia en BD");
      const dbData = await dbRes.json();
      const newEvidence = dbData.data;

      setItemsData((prev) => prev.map((it) => (it.id === itemId ? { ...it, evidence: [...it.evidence, { id: newEvidence.id, url: newEvidence.url }] } : it)));
      toast.success("Imagen guardada", { id: toastId });
    } catch (error: any) {
      toast.error("Error al guardar", { id: toastId, description: error.message });
    } finally {
      setUploadingMap((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const handleRemovePhoto = async (itemId: string, evidenceId: string) => {
    const toastId = toast.loading("Eliminando evidencia...");
    try {
      const res = await fetch(`/api/v1/bodega/movimientos/items/evidencia/${evidenceId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error al eliminar evidencia");

      setItemsData((prev) => prev.map((it) => (it.id === itemId ? { ...it, evidence: it.evidence.filter((ev) => ev.id !== evidenceId) } : it)));
      toast.success("Evidencia eliminada", { id: toastId });
    } catch (error: any) {
      toast.error("Error al eliminar", { id: toastId, description: error.message });
    }
  };

  const handleVerificar = () => {
    if (!movement) return;

    const payload = {
      movementId: movement.id,
      items: itemsData
        .filter((i) => i.quantity > 0 || i.evidence.length > 0)
        .map((i) => ({
          id: i.id,
          quantity: i.quantity,
          observations: i.observations,
        })),
    };

    if (isTransit && !destinationWarehouseId) {
      toast.error("Debe seleccionar una bodega de destino");
      return;
    }

    if (isExecution) {
      applyMovement.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      completeMovement.mutate(
        { ...payload, destinationWarehouseId: isTransit ? destinationWarehouseId : undefined },
        {
          onSuccess: () => onOpenChange(false),
        },
      );
    }
  };

  const isLoading = isExecution ? applyMovement.isPending : completeMovement.isPending;

  if (!movement) return null;

  const totalItems = movement.items?.length || 0;
  const itemsVerificados = itemsData.filter((i) => i.quantity > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="fixed! top-0! left-0! translate-x-0! translate-y-0! z-100! flex flex-col p-0 border-none! rounded-none! w-screen! h-screen! max-w-none! bg-white dark:bg-slate-950 shadow-none duration-0 lg:duration-200 lg:fixed! lg:top-1/2! lg:left-1/2! lg:translate-x-[-50%]! lg:translate-y-[-50%]! lg:w-full! lg:max-w-200! lg:h-auto! lg:max-h-[85vh]! lg:rounded-xl! lg:shadow-2xl"
      >
        <DialogHeader className="p-6 border-b bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
                <PackageCheck className={`h-6 w-6 ${isExecution ? "text-blue-600" : "text-emerald-600"}`} />
                {isExecution ? "Confirmar Ejecución" : "Verificar Movimiento"}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-500 uppercase tracking-widest">
                Folio: <span className="font-bold text-slate-900 dark:text-gray-100">{movement.folio}</span> • {movement.type}
                {movement.reason && <span className="ml-2">• {movement.reason === "INGRESO_TRANSFERENCIA" ? "TRANSFERENCIA" : movement.reason}</span>}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutocomplete}
              className="h-10 px-4 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-900 font-bold uppercase text-[10px] tracking-widest hidden sm:flex items-center gap-2 rounded-md"
            >
              <Zap className="h-4 w-4" />
              Autocompletar Todo
            </Button>
          </div>

          {isTransit && (
            <div className="mt-4 flex flex-col space-y-2 lg:w-1/2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-orange-500" />
                Bodega Destino Receptora *
              </Label>
              <Select value={destinationWarehouseId} onValueChange={setDestinationWarehouseId}>
                <SelectTrigger className="h-10 bg-white dark:bg-slate-900 font-bold text-sm">
                  <SelectValue placeholder="Seleccione bodega donde se recepcionará..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {movement.items?.map((item: any, idx: number) => {
            const rowData = itemsData[idx];
            return (
              <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 p-4 transition-all">
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm uppercase tracking-tight text-slate-900 dark:text-gray-100 truncate">{item.article.name}</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-300">
                        SKU: {item.article.code}
                      </Badge>
                      <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black uppercase">Total: {item.quantity}</Badge>
                      {item.cantidadVerificada > 0 && (
                        <Badge className="bg-blue-500 text-white border-none text-[9px] font-black uppercase italic">Verif. Previa: {Number(item.cantidadVerificada)}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Cantidad a Verificar *</Label>
                      <button onClick={() => handleCantidadChange(item.id, item.quantity.toString())} className="text-[9px] font-bold text-blue-600 uppercase hover:underline">
                        Completar
                      </button>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={itemsData[idx]?.quantity || 0}
                      onChange={(e) => handleCantidadChange(item.id, e.target.value)}
                      className="h-10 bg-white dark:bg-slate-900 font-bold text-sm border-slate-200 dark:border-slate-800 rounded-md ring-offset-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Observaciones (opcional)</Label>
                    <Input
                      value={itemsData[idx]?.observations || ""}
                      onChange={(e) => handleObsChange(item.id, e.target.value)}
                      placeholder="Ej: Faltante, Daño, etc."
                      className="h-10 bg-white dark:bg-slate-900 text-sm border-slate-200 dark:border-slate-800 rounded-md"
                    />
                  </div>
                </div>

                {/* Evidencia por Artículo */}
                <div className="mt-4 space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Evidencia (opcional)</Label>
                  <div className="flex flex-wrap gap-3">
                    {rowData?.evidence.map((ev: ItemEvidence) => (
                      <div key={ev.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                        <img src={ev.url} alt="Evidencia" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleRemovePhoto(item.id, ev.id)}
                          className="absolute top-1 right-1 h-6 w-6 bg-red-500/90 text-white rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-sm"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <label className="flex flex-col items-center justify-center w-full min-h-10 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase">
                        {uploadingMap[item.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        Agregar Foto
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadPhoto(item.id, file);
                        }}
                        disabled={uploadingMap[item.id]}
                      />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-4 text-[11px] font-bold uppercase text-slate-500 tracking-tighter">
              <span>
                Items: <span className="text-slate-900 dark:text-gray-100">{totalItems}</span>
              </span>
              <span>
                Verificados: <span className="text-emerald-600">{itemsVerificados}</span>
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleAutocomplete} className="sm:hidden text-blue-600 text-[10px] font-black uppercase">
              Autocompletar
            </Button>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="h-11 px-6 rounded-md font-bold uppercase text-[11px] tracking-widest border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              onClick={handleVerificar}
              disabled={isLoading || itemsData.every((i) => i.quantity === 0 && i.evidence.length === 0)}
              className={`h-11 px-8 rounded-md ${isExecution ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/10" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10"} text-white font-black uppercase text-[11px] tracking-widest shadow-lg min-w-37.5 transition-all active:scale-95`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PackageCheck className="mr-2 h-4 w-4" />
                  {isExecution ? "Efectuar Ejecución" : "Finalizar Verificación"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
