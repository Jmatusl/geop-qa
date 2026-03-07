"use client";

import { useState, useEffect } from "react";
import { History, Calendar, PenBox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AuditLog {
  id: string;
  action: string;
  description: string;
  createdAt: string | Date;
  metadata?: {
    observations?: string;
    reason?: string;
  };
  creator?: {
    firstName?: string;
    lastName?: string;
  };
}

interface AuditDetailModalProps {
  folio: string;
  logs: AuditLog[];
}

export function AuditDetailModal({ folio, logs }: AuditDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold uppercase tracking-tight text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 rounded-md">
        Ver detalle completo
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold uppercase tracking-tight text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 rounded-md">
          Ver detalle completo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[80vw]! w-full max-h-[85vh]! p-0 overflow-hidden flex flex-col border-none shadow-2xl">
        <DialogHeader className="px-6 py-4 bg-[#284893] text-white flex-none shrink-0 border-b-0 space-y-0 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <History className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-white leading-tight">Bitácora Completa de Auditoría</DialogTitle>
              <DialogDescription className="text-white/60 text-xs mt-0.5">Trazabilidad histórica: {folio}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950">
          <div className="relative pl-10 space-y-8">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-2 bottom-8 w-0.5 bg-slate-200 dark:bg-slate-800" />

            {/* Logs */}
            {(logs || []).map((log, idx) => (
              <div key={log.id} className="relative group">
                <div
                  className={cn(
                    "absolute -left-10 top-0.5 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-950 shadow-md transition-transform group-hover:scale-110 z-10",
                    idx === 0 ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800",
                  )}
                >
                  <History className={cn("h-4 w-4", idx === 0 ? "text-white" : "text-slate-500")} />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className={cn(idx === 0 ? "bg-blue-600" : "bg-slate-400", "text-[10px] font-black tracking-widest uppercase border-none h-5")}>{log.action}</Badge>
                      {idx === 0 && <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter">Evento más reciente</span>}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md">
                      <Calendar className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleString("es-CL", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{log.description}</div>

                  {(log.metadata?.observations || log.metadata?.reason) && (
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-500 rounded-r-lg">
                      <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1 flex items-center gap-1.5">
                        <PenBox className="h-3 w-3" /> Comentarios del Usuario
                      </div>
                      <div className="text-[13px] text-blue-800 dark:text-blue-200 font-bold italic leading-snug">"{log.metadata.observations || log.metadata.reason}"</div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-black text-slate-500 uppercase">
                      {log.creator?.firstName?.[0] || ""}
                      {log.creator?.lastName?.[0] || ""}
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none">
                        {log.creator?.firstName} {log.creator?.lastName}
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-bold">Responsable del Registro</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
