/**
 * Componente: Modal de Número de Orden de Compra
 * Archivo: app/insumos/[id]/components/PurchaseOrderDialog.tsx
 *
 * Modal para asignar o editar el número de orden de compra a una cotización aprobada.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Info, ShoppingCart, Save, X, AlertCircle } from "lucide-react";

interface Props {
  quotationId: string | null;
  currentValue?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (quotationId: string, purchaseOrderNumber: string) => Promise<void>;
  saving?: boolean;
}

export default function PurchaseOrderDialog({
  quotationId,
  currentValue,
  open,
  onOpenChange,
  onSave,
  saving = false,
}: Props) {
  const [value, setValue] = useState<string>(currentValue || "");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (currentValue && String(currentValue).trim().length > 0) {
      setValue(currentValue);
    } else {
      setValue("");
    }
    setTouched(false);
  }, [currentValue, open]);

  const handleSave = async () => {
    if (!quotationId) return;
    
    const trimmed = value.trim();
    if (!trimmed) {
      setTouched(true);
      return;
    }

    await onSave(quotationId, trimmed);
  };

  const isValid = value.trim().length > 0;
  const showError = touched && !isValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col">
        {/* Header con estilo mejorado */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-linear-to-r from-[#283c7f] to-[#344690] text-white shrink-0">
          <DialogTitle className="text-xl font-bold inline-flex items-center gap-3">
            <div className="bg-white/20 rounded-md p-2">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            Asignar Número de Orden de Compra
          </DialogTitle>
          <DialogDescription className="text-white/90 text-sm mt-2">
            Ingrese el número de orden de compra generado en el sistema de adquisiciones para esta cotización aprobada.
          </DialogDescription>
        </DialogHeader>

        {/* Contenido */}
        <div className="px-6 py-5 space-y-4">
          {/* Alerta si ya existe un valor */}
          {currentValue && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1">Ya existe un número asignado</div>
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  Valor actual: <span className="font-bold text-amber-900 dark:text-amber-100">{currentValue}</span>
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Al guardar este nuevo valor, se sobrescribirá el número anterior.
                </div>
              </div>
            </div>
          )}

          {/* Campo de entrada */}
          <div className="space-y-2">
            <Label htmlFor="purchase-order" className="text-sm font-semibold flex items-center gap-2">
              Número de Orden de Compra
              <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5 font-normal">
                Requerido
              </Badge>
            </Label>
            <Input
              id="purchase-order"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (!touched) setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              maxLength={64}
              placeholder="Ej: OC-2026-7890"
              disabled={saving}
              className={`text-base ${showError ? "border-red-500 focus-visible:ring-red-500" : "border-blue-300 focus-visible:ring-blue-500"}`}
              autoComplete="off"
            />
            {showError && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                El número de orden es requerido
              </p>
            )}
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Ingrese el número correlativo asignado por el sistema de compras. Este número se utilizará para la 
                trazabilidad y seguimiento de la orden.
              </span>
            </p>
          </div>
        </div>

        {/* Footer con botones siempre visibles */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20 shrink-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={saving}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !isValid}
            className="bg-[#283c7f] hover:bg-[#1e2f63] text-white gap-2"
          >
            <Save className="h-4 w-4 text-white" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
