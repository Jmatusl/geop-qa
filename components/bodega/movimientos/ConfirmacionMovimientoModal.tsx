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

interface ConfirmacionMovimientoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (verificacionAuto: boolean) => void;
  isPending: boolean;
  tipo: string;
  itemCount: number;
  verificacionAuto: boolean;
  onVerificacionAutoChange: (value: boolean) => void;
}

export function ConfirmacionMovimientoModal({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  tipo,
  itemCount,
  verificacionAuto,
  onVerificacionAutoChange
}: ConfirmacionMovimientoModalProps) {
  
  const isIngreso = tipo.includes("INGRESO");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md bg-white dark:bg-slate-950 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <ShieldAlert className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <AlertDialogTitle className="text-xl font-black text-slate-900 dark:text-gray-100 italic uppercase tracking-tighter">
              {isIngreso ? "¿CONFIRMAR INGRESO?" : "¿CONFIRMAR REGISTRO?"}
            </AlertDialogTitle>
          </div>

          <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Está por procesar un registro de <strong>{itemCount}</strong> artículo(s). La configuración actual permite la validación o habilitación automática.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Switch de Verificación */}
        <div
          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer mb-6 ${
            verificacionAuto
              ? "bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800"
              : "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 hover:border-slate-300"
          }`}
          onClick={() => onVerificacionAutoChange(!verificacionAuto)}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-slate-900 dark:text-gray-100 uppercase tracking-tight">AUTO-ACTIVAR / VERIFICAR</span>
              {verificacionAuto && <Badge className="bg-blue-600 hover:bg-blue-700 text-[9px] h-4 px-1 leading-none text-white border-none italic">OPCIONAL</Badge>}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              {verificacionAuto ? "Se saltará el flujo de verificación y la operación aplicará inmediatamente." : "Se mantendrá como pendiente hasta que se verifique manualmente."}
            </p>
          </div>
          <div
            className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center border-2 transition-all ${
              verificacionAuto ? "bg-blue-600 border-blue-600 shadow-sm shadow-blue-500/20" : "border-slate-300 dark:border-slate-600"
            }`}
          >
            {verificacionAuto && <Check className="w-4 h-4 text-white" />}
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
              onConfirm(verificacionAuto);
            }}
            disabled={isPending}
            className="flex-1 h-12 rounded-xl bg-[#284893] hover:bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95"
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
