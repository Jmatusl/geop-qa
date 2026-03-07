"use client";

/**
 * COMPONENTE - MOVIMIENTO DETALLE (VISTA MÓVIL)
 */

import React from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  ArrowUpRight, 
  Calendar, 
  User, 
  MapPin, 
  Tag, 
  FileText, 
  Box, 
  Camera, 
  History,
  Info,
  CornerDownRight,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DetalleMovimientoMobileProps {
  movement: any;
  parsedObs: any;
  creationDate: string;
  appliedDate: string;
}

export default function DetalleMovimientoMobile({ movement, parsedObs, creationDate, appliedDate }: DetalleMovimientoMobileProps) {
  const router = useRouter();

  const isApplied = movement.status === "EJECUTADO" || movement.status === "APLICADO" || movement.status === "COMPLETADO";
  const displayStatus = movement.status === "APLICADO" ? "EJECUTADO" : movement.status;

  const getStatusBadgeClass = (status: string) => {
    if (status === "EJECUTADO" || status === "APLICADO") return "bg-emerald-500 text-white border-none";
    if (status === "COMPLETADO") return "bg-purple-600 text-white border-none";
    if (status === "APROBADO") return "bg-indigo-500 text-white border-none";
    if (status === "RECHAZADO") return "bg-red-500 text-white border-none";
    return "bg-amber-500 text-white border-none";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* ── HEADER ── */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">Movimiento</h1>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-gray-900 dark:text-white truncate">{movement.folio}</span>
              <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5", getStatusBadgeClass(movement.status))}>
                {displayStatus}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── INFO GENERAL ── */}
        <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-blue-500" /> Tipo
                </span>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{movement.movementType}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Box className="w-3 h-3 text-purple-500" /> CeCo
                </span>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{parsedObs.cc}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-500" /> Bodega
                </span>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{movement.warehouse?.name || "—"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-orange-500" /> Fecha
                </span>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{creationDate}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Referencia</span>
                <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  {movement.externalReference || parsedObs.docRef || movement.request?.externalReference || movement.request?.folio || movement.reason || "Sin referencia"}
                </p>
              </div>
              {parsedObs.main && (
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Justificación</span>
                  <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300 leading-relaxed italic border-l-2 border-blue-500 pl-3">
                    {parsedObs.main}
                  </p>
                </div>
              )}
            </div>
            
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 capitalize text-[10px] font-black">
                  {movement.creator ? movement.creator.firstName[0] : "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Iniciado por</p>
                  <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate">
                    {movement.creator ? `${movement.creator.firstName} ${movement.creator.lastName}` : "Sistema"}
                  </p>
                </div>
              </div>
              {movement.responsable && (
                <div className="text-right">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Responsable</p>
                  <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{movement.responsable}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── ARTÍCULOS ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-blue-500" /> Artículos ({movement.items?.length || 0})
            </h2>
            <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold border-none text-[10px]">
              {movement.totalItems || 0} UNI
            </Badge>
          </div>

          <div className="space-y-3">
            {movement.items?.map((item: any) => (
              <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-transparent dark:border-gray-800 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                  <Box className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-[13px] font-bold text-gray-900 dark:text-white leading-tight">{item.article.name}</h3>
                    <div className="text-right shrink-0">
                      <div className="text-[14px] font-black text-blue-600 dark:text-blue-400">
                        {Number(item.quantity || item.initialBalance || 0).toLocaleString("es-CL")}
                      </div>
                      <div className="text-[8px] font-black text-gray-400 uppercase">{item.article.unit || "UDS"}</div>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-tight">Cód: {item.article.code}</p>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-800/50">
                    <div className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" /> Val. Unit: 
                      <span className="text-gray-700 dark:text-gray-300 ml-1">${Number(item.unitCost || 0).toLocaleString("es-CL")}</span>
                    </div>
                    <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                      Total: ${((Number(item.quantity || item.initialBalance || 0)) * Number(item.unitCost || 0)).toLocaleString("es-CL")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-blue-600 rounded-xl p-4 flex items-center justify-between text-white shadow-lg shadow-blue-500/20">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Valor Total</span>
            <span className="text-lg font-black">${Number(movement.totalPrice || 0).toLocaleString("es-CL")}</span>
          </div>
        </div>

        {/* ── EVIDENCIA ── */}
        {movement.evidences && movement.evidences.length > 0 && (
          <div className="space-y-3 pt-2">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-orange-500" /> Evidencia ({movement.evidences.length})
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {movement.evidences.map((evidence: any) => (
                <a 
                  key={evidence.id} 
                  href={evidence.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 active:scale-95 transition-transform"
                >
                  <img src={evidence.url} alt="Evidencia" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── HISTORIAL / TRAZABILIDAD ── */}
        <div className="space-y-3 pt-2">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-slate-500" /> Trazabilidad
          </h2>
          
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-transparent dark:border-gray-800 shadow-sm relative overflow-hidden">
            <div className="absolute left-6 top-6 bottom-10 w-px bg-gray-100 dark:bg-gray-800" />
            
            <div className="space-y-6">
              {movement.request?.logs?.map((log: any, idx: number) => (
                <div key={log.id} className="relative pl-7">
                  <div className={cn(
                    "absolute -left-1.25 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 z-10",
                    idx === 0 ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-gray-300 dark:bg-gray-700"
                  )} />
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-tight text-gray-900 dark:text-white leading-none">
                        {log.action}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400">
                        {new Date(log.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                      {log.description}
                    </p>
                    <div className="flex items-center gap-1.5 opacity-60">
                      <div className="w-3.5 h-3.5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[7px] font-black uppercase">
                        {log.creator?.firstName[0] || "U"}
                      </div>
                      <span className="text-[8px] font-black text-gray-400 uppercase">{log.creator?.firstName} {log.creator?.lastName}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {!movement.request && (
                <div className="flex flex-col items-center py-4 text-center">
                  <Info className="w-8 h-8 text-gray-200 dark:text-gray-800 mb-2" />
                  <p className="text-[10px] font-bold text-gray-400 italic">No hay registros de trazabilidad disponibles para este movimiento manual</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
