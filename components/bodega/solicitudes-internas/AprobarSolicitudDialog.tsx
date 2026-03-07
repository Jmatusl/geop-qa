"use client";

/**
 * Diálogo reutilizable para aprobar una Solicitud Interna de Bodega.
 * Carga los artículos desde la API y permite seleccionarlos / ajustar cantidades.
 * Uso: pasar `requestId` y controlar visibilidad con `open` / `onOpenChange`.
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ApproveItem {
  id: string;
  articleCode: string;
  articleName: string;
  quantity: number;
  warehouseName: string | null;
  unit: string;
}

interface ApproveItemState {
  id: string;
  checked: boolean;
  qty: number;
}

interface AprobarSolicitudDialogProps {
  /** ID de la solicitud a aprobar */
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Callback llamado tras una aprobación exitosa */
  onSuccess?: () => void;
}

export function AprobarSolicitudDialog({ requestId, open, onOpenChange, onSuccess }: AprobarSolicitudDialogProps) {
  const [items, setItems] = useState<ApproveItem[]>([]);
  const [approveItems, setApproveItems] = useState<ApproveItemState[]>([]);
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Carga artículos cuando el diálogo se abre
  useEffect(() => {
    if (!open || !requestId) return;

    let cancelled = false;
    setLoading(true);
    setItems([]);
    setApproveItems([]);
    setObservations("");

    fetch(`/api/v1/bodega/solicitudes-internas/${requestId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const mapped: ApproveItem[] = (data.items ?? []).map((item: any) => ({
          id: item.id,
          articleCode: item.article?.code ?? item.articleCode ?? "",
          articleName: item.article?.name ?? item.articleName ?? "",
          quantity: Number(item.quantity),
          warehouseName: item.warehouse?.name ?? item.warehouseName ?? null,
          unit: item.article?.unit ?? item.unit ?? "und",
        }));
        setItems(mapped);
        setApproveItems(mapped.map((i) => ({ id: i.id, checked: true, qty: i.quantity })));
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("No se pudieron cargar los artículos de la solicitud");
          onOpenChange(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, requestId]);

  const selectedCount = approveItems.filter((i) => i.checked).length;

  const handleConfirm = async () => {
    if (!requestId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/bodega/solicitudes-internas/${requestId}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ observations: observations || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "No se pudo aprobar la solicitud");
        return;
      }
      toast.success("Solicitud aprobada correctamente");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Ocurrió un error inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-w-[90vw] sm:max-w-lg md:max-w-2xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-base font-black uppercase tracking-tight">Aprobar Solicitud</DialogTitle>
          <DialogDescription className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
            Selecciona los artículos a aprobar y ajusta las cantidades si es necesario. Los artículos no seleccionados serán rechazados automáticamente.
          </DialogDescription>
        </DialogHeader>

        {/* Lista de artículos */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest">Cargando artículos...</span>
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-border">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                  Artículos ({selectedCount} de {items.length} seleccionados)
                </p>
              </div>
              <div className="divide-y divide-border/60 max-h-[45vh] overflow-y-auto">
                {items.map((item, idx) => {
                  const ai = approveItems[idx];
                  if (!ai) return null;
                  const max = item.quantity;
                  return (
                    <div key={item.id} className={cn("flex items-center gap-3 px-4 py-3 transition-colors", ai.checked ? "bg-emerald-50/40 dark:bg-emerald-950/10" : "opacity-50")}>
                      <Checkbox
                        id={`approve-dlg-${item.id}`}
                        checked={ai.checked}
                        onCheckedChange={(v) => setApproveItems((prev) => prev.map((x, i) => (i === idx ? { ...x, checked: !!v } : x)))}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black uppercase italic text-gray-900 dark:text-gray-100 truncate">{item.articleName}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                          ID Artículo: {item.articleCode}
                          {item.warehouseName && <> &bull; Bodega: {item.warehouseName}</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Aprobar:</span>
                        <Input
                          type="number"
                          min={1}
                          max={max}
                          value={ai.qty}
                          disabled={!ai.checked}
                          onChange={(e) => {
                            const val = Math.min(max, Math.max(1, Number(e.target.value)));
                            setApproveItems((prev) => prev.map((x, i) => (i === idx ? { ...x, qty: val } : x)));
                          }}
                          className="w-16 h-8 text-center text-xs font-bold"
                          autoComplete="off"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">
                          / {max} {item.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Comentarios */}
        {!loading && (
          <div className="px-6 pb-4">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2 block">Comentarios (opcional)</label>
            <Textarea
              placeholder="Observaciones sobre la aprobación..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full text-sm"
              rows={2}
              autoComplete="off"
            />
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/30 flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="gap-1.5 dark:text-white">
            <X className="w-3.5 h-3.5" /> Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || loading || selectedCount === 0} className="bg-[#283c7f] hover:bg-[#1e2e6b] text-white gap-1.5">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-white" />}
            Aprobar Solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
