"use client";

import React from "react";
import { 
  Check, 
  Loader2, 
  ShieldAlert 
} from "lucide-react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface ConfirmacionRetiroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (aprobacionAuto: boolean) => void;
  isPending: boolean;
  itemCount: number;
  totalUnidades: number;
  aprobacionAuto: boolean;
  onAprobacionAutoChange: (value: boolean) => void;
  isAutoAprobar: boolean;
  isEntregaInmediata: boolean;
}

export function ConfirmacionRetiroModal({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  itemCount,
  totalUnidades,
  aprobacionAuto,
  onAprobacionAutoChange,
  isAutoAprobar,
  isEntregaInmediata
}: ConfirmacionRetiroModalProps) {
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md bg-white dark:bg-slate-950 rounded-2xl p-6 shadow-2xl border border-orange-200 dark:border-orange-900/50">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
              <ShieldAlert className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <AlertDialogTitle className="text-xl font-black text-slate-900 dark:text-gray-100 italic uppercase tracking-tighter">
              ¿CONFIRMAR RETIRO?
            </AlertDialogTitle>
          </div>

          <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Está por procesar un retiro de <strong>{itemCount}</strong> artículo(s) para un total de <strong>{totalUnidades}</strong> unidades.
            {isEntregaInmediata || isAutoAprobar 
              ? " La configuración actual permite la aprobación y entrega inmediata." 
              : " La configuración actual requiere preparación y entrega manual."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Switch de Verificación */}
        <div
          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer mb-6 ${
            aprobacionAuto
              ? "bg-orange-50/50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800"
              : "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 hover:border-slate-300"
          }`}
          onClick={() => onAprobacionAutoChange(!aprobacionAuto)}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-slate-900 dark:text-gray-100 uppercase tracking-tight">
                {isEntregaInmediata || isAutoAprobar ? "AUTO-APROBAR / ENTREGAR" : "AUTO-APROBAR SOLICITUD"}
              </span>
              {aprobacionAuto && <Badge className="bg-orange-600 hover:bg-orange-700 text-[9px] h-4 px-1 leading-none text-white border-none italic">OPCIONAL</Badge>}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              {aprobacionAuto
                ? isEntregaInmediata || isAutoAprobar
                  ? "La solicitud será aprobada y el stock será descontado inmediatamente."
                  : "La solicitud será aprobada automáticamente, permitiendo gestionar el retiro luego."
                : "La solicitud quedará pendiente de aprobación manual por un Supervisor."}
            </p>
          </div>
          <div
            className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center border-2 transition-all ${
              aprobacionAuto ? "bg-orange-600 border-orange-600 shadow-sm shadow-orange-500/20" : "border-slate-300 dark:border-slate-600"
            }`}
          >
            {aprobacionAuto && <Check className="w-4 h-4 text-white" />}
          </div>
        </div>

        <AlertDialogFooter className="flex gap-3">
          <AlertDialogCancel
            className="flex-1 h-12 rounded-xl border-slate-200 dark:border-slate-800 text-sm font-black uppercase text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm(aprobacionAuto);
            }}
            disabled={isPending}
            className="flex-1 h-12 rounded-xl bg-orange-600 hover:bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-900/20 active:scale-95 transition-transform"
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                PROCESAR
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
