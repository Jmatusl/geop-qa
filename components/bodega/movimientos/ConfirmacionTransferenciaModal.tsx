"use client";

import React from "react";
import { Check, Loader2, Truck, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmacionTransferenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (isAutoVerified?: boolean) => void;
  isSubmitting: boolean;
  itemCount: number;
  bodegaOrigenNombre?: string;
  bodegaDestinoNombre?: string;
  title?: string;
  verificacionAuto?: boolean;
  onVerificacionAutoChange?: (val: boolean) => void;
}

export function ConfirmacionTransferenciaModal({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  itemCount,
  bodegaOrigenNombre,
  bodegaDestinoNombre,
  title = "¿Confirmar transferencia?",
  verificacionAuto,
  onVerificacionAutoChange
}: ConfirmacionTransferenciaModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-gray-950 rounded-t-2xl sm:rounded-2xl p-6 md:p-8 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-8 border-t sm:border border-gray-200 dark:border-gray-800">
        <h3 className="text-xl font-black text-[#283c7f] dark:text-white uppercase tracking-tight mb-3 italic">{title}</h3>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Se moverán <strong className="text-gray-900 dark:text-gray-100">{itemCount}</strong> lote(s) de stock.
        </p>
        
        {bodegaOrigenNombre && bodegaDestinoNombre && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg mb-6 flex flex-col gap-1">
            <span className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest">Ruta del Lote</span>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 uppercase">
              {bodegaOrigenNombre} <Truck className="w-3 h-3 text-blue-500" /> {bodegaDestinoNombre}
            </p>
          </div>
        )}

        {/* Switch de Verificación (Opcional, usado en escritorio) */}
        {onVerificacionAutoChange !== undefined && (
          <div
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer mb-6",
              verificacionAuto
                ? "bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800"
                : "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 hover:border-slate-300"
            )}
            onClick={() => onVerificacionAutoChange(!verificacionAuto)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-gray-100 uppercase tracking-tight">AUTO-ACTIVAR / VERIFICAR</span>
                {verificacionAuto && (
                  <span className="bg-blue-600 text-[9px] h-4 px-1 flex items-center leading-none text-white border-none italic font-black rounded">
                    OPCIONAL
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {verificacionAuto 
                  ? "Se saltará el flujo de verificación y la operación aplicará inmediatamente." 
                  : "Se mantendrá como pendiente hasta que se verifique manualmente."}
              </p>
            </div>
            <div
              className={cn(
                "w-6 h-6 shrink-0 rounded-lg flex items-center justify-center border-2 transition-all",
                verificacionAuto ? "bg-blue-600 border-blue-600 shadow-sm shadow-blue-500/20" : "border-slate-300 dark:border-slate-600"
              )}
            >
              {verificacionAuto && <Check className="w-4 h-4 text-white" />}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1 py-3.5 rounded-xl border border-gray-300 dark:border-gray-700 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(verificacionAuto)}
            disabled={isSubmitting}
            className="flex-[1.5] flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-3" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
