"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { useActualizarNumeroOrdenCompra, useCotizacion } from "@/hooks/useCotizaciones";

interface Props {
  cotizacionId: number;
  valorInicial?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated?: any) => void;
}

export default function DialogoNumeroOrdenCompra({ cotizacionId, valorInicial, open, onOpenChange, onSuccess }: Props) {
  const [valor, setValor] = useState<string>(valorInicial || "");
  const mutation = useActualizarNumeroOrdenCompra();
  const loading = (mutation as any)?.isLoading || (mutation as any)?.status === "loading";
  // obtener cotización por id en caso de que valorInicial no venga
  const cotizacionQuery = useCotizacion(cotizacionId || null);
  const purchaseOrderFromServer = (cotizacionQuery?.data as any)?.data?.purchaseOrderNumber;
  const existingOrder = valorInicial || purchaseOrderFromServer || null;

  useEffect(() => {
    // Si se recibe valorInicial respetarlo, si no y el servidor tiene uno, inicializar con ese
    if (valorInicial && String(valorInicial).trim().length > 0) {
      setValor(valorInicial);
    } else if (!valorInicial && purchaseOrderFromServer) {
      setValor(purchaseOrderFromServer);
    } else {
      setValor("");
    }
  }, [valorInicial, purchaseOrderFromServer]);

  const guardar = async () => {
    const trimmed = (valor || "").trim();
    if (!trimmed) {
      toast.error("El número de orden no puede estar vacío");
      return;
    }
    try {
      const res: any = await mutation.mutateAsync({ cotizacionId, purchaseOrderNumber: trimmed });
      if (res?.success) {
        onOpenChange(false);
        onSuccess?.(res.data);
      }
    } catch (e: any) {
      // el hook ya muestra toast en onError
      console.error("Error guardando número de orden", e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Número de Orden de Compra</DialogTitle>
          <DialogDescription>Ingrese el número de orden de compra para esta cotización aprobada.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {existingOrder ? (
            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-900 text-sm">
              <Info className="w-4 h-4 mt-0.5" />
              <div>
                <div className="font-medium">Ya existe un número de orden de compra</div>
                <div className="text-xs">
                  Valor actual: <span className="font-semibold">{existingOrder}</span>. Al guardar se sobrescribirá este valor.
                </div>
              </div>
            </div>
          ) : null}
          <div>
            <Label>Número de Orden</Label>
            <Input value={valor} onChange={(e) => setValor(e.target.value)} maxLength={64} placeholder="Ej: 7890" />
          </div>

          <div className="flex items-center justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
