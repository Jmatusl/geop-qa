"use client";

/**
 * COMPONENTE - MOVIMIENTO DETALLE (VISTA DESKTOP)
 */

import React from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  Calendar, 
  User, 
  Info, 
  MapPin, 
  Tag, 
  FileText, 
  Box, 
  Camera, 
  History 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";
import { cn } from "@/lib/utils";
import { AuditDetailModal } from "@/components/bodega/movimientos/AuditDetailModal";
import { EditableObservationField } from "@/components/bodega/movimientos/EditableObservationField";

interface DetalleMovimientoDesktopProps {
  movement: any;
  parsedObs: any;
  creationDateFull: string;
  creationDateShort: string;
  appliedDateShort: string;
  creatorName: string;
}

export default function DetalleMovimientoDesktop({
  movement,
  parsedObs,
  creationDateFull,
  creationDateShort,
  appliedDateShort,
  creatorName
}: DetalleMovimientoDesktopProps) {

  const isApplied = movement.status === "EJECUTADO" || movement.status === "APLICADO" || movement.status === "COMPLETADO";
  const displayStatus = movement.status === "APLICADO" ? "EJECUTADO" : movement.status;

  const getStatusBadgeClass = (status: string) => {
    if (status === "EJECUTADO" || status === "APLICADO") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200";
    if (status === "COMPLETADO") return "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200";
    if (status === "APROBADO") return "bg-indigo-100 text-indigo-700 border-indigo-200";
    if (status === "RECHAZADO") return "bg-red-100 text-red-700 border-red-200";
    return "bg-amber-100 text-amber-700 border-amber-200";
  };

  return (
    <div className="w-full space-y-5 p-0 bg-[#f8fafc] dark:bg-transparent min-h-screen">
      <BodegaBreadcrumb items={[{ label: "Bodega", href: "/bodega" }, { label: "Movimientos", href: "/bodega/movimientos" }, { label: movement.folio }]} />

      {/* Header Card */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0 rounded-full border-slate-200 dark:border-slate-800 dark:bg-slate-900">
              <Link href="/bodega/movimientos">
                <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </Link>
            </Button>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <ArrowUpRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-white tracking-tight leading-none">{movement.folio}</h1>
                <Badge className={cn("px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider", getStatusBadgeClass(movement.status))}>{displayStatus}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-blue-600/80 dark:text-blue-400/80 font-medium">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>Fecha Ofic.: {creationDateFull}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <User className="h-4 w-4" />
                  <span>Iniciado por {creatorName}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Detalles del Movimiento (Left, spans 2 columns on lg) */}
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 col-span-1 lg:col-span-2">
          <CardHeader className="border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-4 px-5">
            <CardTitle className="flex items-center gap-2 text-[15px] font-bold text-slate-800 dark:text-white">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Detalles del Movimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
              {/* Row 1 */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <Info className="h-3 w-3" /> TIPO DE MOVIMIENTO
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold text-slate-800 dark:text-slate-200">
                  {movement.movementType}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <Box className="h-3 w-3" /> CENTRO DE COSTO
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {parsedObs.cc}
                </div>
              </div>
              <EditableObservationField
                movementId={movement.id}
                field="docRef"
                label="REFERENCIA"
                initialValue={movement.externalReference || parsedObs.docRef || (movement as any).request?.externalReference || (movement as any).request?.folio || movement.reason || "Sin referencia"}
              />

              {/* Row 2 */}
              <EditableObservationField movementId={movement.id} field="cotizacion" label="N° COTIZACIÓN" initialValue={parsedObs.cotizacion} />
              <EditableObservationField movementId={movement.id} field="guia" label="GUÍA DESPACHO" initialValue={parsedObs.guia} />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <MapPin className="h-3 w-3" /> BODEGA ORIGEN
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {movement.movementType === "INGRESO" ? "—" : (movement as any).warehouse.name}
                </div>
              </div>

              {/* Row 3 */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <MapPin className="h-3 w-3" /> BODEGA DESTINO
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {movement.movementType === "INGRESO" ? (movement as any).warehouse.name : "Despacho / Consumo"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <Calendar className="h-3 w-3" /> FECHA DEL MOVIMIENTO (OFICIAL)
                </div>
                <div className="bg-slate-50/50 dark:bg-blue-900/10 border border-slate-200 dark:border-blue-800/50 rounded-lg p-2.5 text-sm font-bold text-blue-700 dark:text-blue-400">
                  {creationDateShort}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <Calendar className="h-3 w-3" /> FECHA REGISTRO (SISTEMA)
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold text-slate-800 dark:text-slate-200">
                  {creationDateShort}
                </div>
              </div>
            </div>

            {/* Span Text Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <div className="text-[12px] font-bold text-slate-500 dark:text-slate-400">Descripción</div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-[13px] font-medium text-slate-700 dark:text-slate-300 min-h-20">
                  {movement.reason || "Sin descripción"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[12px] font-bold text-slate-500 dark:text-slate-400">Observaciones</div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-[13px] font-medium text-slate-700 dark:text-slate-300 min-h-20">
                  {parsedObs.main || "Sin observaciones"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estado y Auditoría (Right column) */}
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden flex flex-col h-full">
          <CardHeader className="border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-4 px-5">
            <CardTitle className="flex items-center gap-2 text-[12px] font-black uppercase text-slate-800 dark:text-white tracking-wide">
              <History className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              ESTADO Y AUDITORÍA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isApplied ? "bg-emerald-500/10" : "bg-slate-100 dark:bg-slate-800"}`}>
                <History className={`h-5 w-5 ${isApplied ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-black uppercase text-slate-900 dark:text-white leading-none mb-1 truncate">{displayStatus}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Última Act.: {appliedDateShort}</div>
              </div>
              {movement.responsable && (
                <div className="pl-3 border-l border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-black text-[#284893] dark:text-blue-400 uppercase truncate max-w-30">{movement.responsable}</div>
                  <div className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Responsable</div>
                </div>
              )}
            </div>

            <div className="p-3.5 flex-1 relative bg-slate-50/30 dark:bg-slate-900/20 overflow-y-auto max-h-85">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono">{movement.request ? "TRAZABILIDAD SOLICITUD" : "LOG DE MOVIMIENTO"}</div>

                <AuditDetailModal folio={movement.folio} logs={(movement as any).request?.logs || []} />
              </div>

              <div className="relative pl-6 space-y-5">
                {/* Timeline line */}
                <div className="absolute left-2.25 top-1.5 bottom-4 w-px bg-slate-200 dark:bg-slate-800" />

                {(movement as any).request?.logs?.slice(0, 4).map((log: any, idx: number) => (
                  <div key={log.id} className="relative">
                    <div
                      className={cn(
                        "absolute -left-6 top-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950 shadow-xs z-10",
                        idx === 0 ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700",
                      )}
                    >
                      <History className="h-2 w-2 text-white" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none">{log.action}</span>
                        {idx === 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">{log.description}</div>

                      {(log.metadata?.observations || log.metadata?.reason) && (
                        <div className="mt-1.5 p-1.5 bg-blue-50/40 dark:bg-blue-900/10 border-l border-blue-400 rounded-r text-[9px] text-blue-700 dark:text-blue-300 font-bold italic line-clamp-2">
                          "{log.metadata.observations || log.metadata.reason}"
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-1 opacity-60">
                        <span className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-20">{log.creator?.firstName}</span>
                        <span className="text-[9px] text-slate-300">•</span>
                        <span className="text-[9px] text-slate-400">{new Date(log.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {((movement as any).request?.logs?.length || 0) > 4 && (
                  <div className="text-center pt-2">
                    <p className="text-[9px] font-bold text-slate-400 italic">... y {(movement as any).request.logs.length - 4} eventos más</p>
                  </div>
                )}

                {!(movement as any).request && (
                  <div className="text-center py-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                    <History className="h-4 w-4 text-slate-300 mx-auto mb-1" />
                    <p className="text-[9px] font-bold text-slate-400 italic">No hay historial de trazabilidad disponible</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-800 text-center text-[10px] italic text-slate-400 dark:text-slate-500">Trazabilidad de auditoría</div>
          </CardContent>
        </Card>
      </div>

      {/* Artículos del Movimiento */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden">
        <CardHeader className="border-b dark:border-slate-800 bg-white dark:bg-slate-900/30 py-4 px-5 flex flex-row items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-[16px] font-extrabold uppercase text-slate-900 dark:text-white tracking-tight">ARTÍCULOS DEL MOVIMIENTO</CardTitle>
              <div className="text-xs text-slate-500 dark:text-slate-400">{(movement as any).items.length} artículo(s) registrados</div>
            </div>
          </div>
          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 px-3 py-1 font-bold shadow-none">
            {(movement as any).items.length} items
          </Badge>
        </CardHeader>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b dark:border-slate-800 bg-white dark:bg-slate-900/50">
                <th className="py-3 px-5 text-[11px] font-black text-slate-900 dark:text-blue-500 uppercase tracking-widest text-left">ARTÍCULO / REPUESTO</th>
                <th className="py-3 px-5 text-[11px] font-black text-slate-900 dark:text-blue-500 uppercase tracking-widest text-center">CANTIDAD</th>
                <th className="py-3 px-5 text-[11px] font-black text-slate-900 dark:text-blue-500 uppercase tracking-widest text-right">PRECIO UNITARIO</th>
                <th className="py-3 px-5 text-[11px] font-black text-slate-900 dark:text-blue-500 uppercase tracking-widest text-right">TOTAL</th>
                <th className="py-3 px-5 text-[11px] font-black text-slate-900 dark:text-blue-500 uppercase tracking-widest text-left">OBSERVACIONES</th>
              </tr>
            </thead>
            <tbody>
              {((movement as any).items || []).map((item: any) => (
                <tr key={item.id} className="border-b dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="py-4 px-5">
                    <div className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{item.article.name}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">ID Artículo: {item.article.code}</div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <div className="font-black text-[15px] text-slate-900 dark:text-white">{(Number(item.quantity || 0) || Number(item.initialBalance || 0)).toLocaleString("es-CL")}</div>
                  </td>
                  <td className="py-4 px-5 text-right font-bold text-slate-700 dark:text-slate-300">${Number(item.unitCost || 0).toLocaleString("es-CL")}</td>
                  <td className="py-4 px-5 text-right font-black text-blue-700 dark:text-blue-400">
                    ${((Number(item.quantity || 0) || Number(item.initialBalance || 0)) * Number(item.unitCost || 0)).toLocaleString("es-CL")}
                  </td>
                  <td className="py-4 px-5 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-bold border dark:border-slate-800 px-1.5 py-0.5 rounded text-[11px] uppercase bg-slate-50 dark:bg-slate-900 mr-2 text-slate-500 dark:text-slate-500">
                      {movement.movementType === "INGRESO" ? "LOTE" : "FIFO"}
                    </span>
                    {item.observations || `De mov. ${movement.folio}`}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50/50 dark:bg-slate-900/50 border-t-2 border-slate-200 dark:border-slate-800">
              <tr>
                <td className="py-4 px-5 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">TOTALES DEL MOVIMIENTO</td>
                <td className="py-4 px-5 text-center font-black text-slate-900 dark:text-white text-base">{((movement as any).totalItems ?? 0).toLocaleString("es-CL")}</td>
                <td className="py-4 px-5"></td>
                <td className="py-4 px-5 text-right font-black text-blue-700 dark:text-blue-400 text-base">${((movement as any).totalPrice ?? 0).toLocaleString("es-CL")}</td>
                <td className="py-4 px-5"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Evidencia del Movimiento */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden mt-6">
        <CardHeader className="border-b dark:border-slate-800 bg-white dark:bg-slate-900/30 py-4 px-5 flex flex-row items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-3 text-[16px] font-extrabold uppercase text-slate-900 dark:text-white tracking-tight">
                EVIDENCIA DEL MOVIMIENTO
                <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-none px-2.5 py-0.5 text-xs font-bold shadow-none rounded-md">
                  {(movement as any).evidences?.length || 0}
                </Badge>
              </CardTitle>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Fotos cargadas durante el registro del movimiento</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {!(movement as any).evidences || (movement as any).evidences.length === 0 ? (
            <div className="flex items-center justify-center min-h-40 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="text-sm font-medium text-slate-400 dark:text-slate-600 flex flex-col items-center gap-2">
                <Camera className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                No hay evidencia adjunta
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {(movement as any).evidences.map((evidence: any) => (
                <div key={evidence.id} className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-900">
                  <img src={evidence.url} alt={evidence.fileName || "Evidencia"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-zoom-in" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" size="sm" asChild className="h-7 text-[10px] uppercase font-black tracking-widest">
                      <a href={evidence.url} target="_blank" rel="noopener noreferrer">
                        Ver Grande
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
