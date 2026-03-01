import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Calendar, User, Info, MapPin, Tag, FileText, FileSearch, PenLine, PenBox, CheckCircle2, History, Box, Camera } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

function getStatusBadgeClass(status: string) {
  if (status === "APLICADO") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200";
  if (status === "APROBADO") return "bg-indigo-100 text-indigo-700 border-indigo-200";
  if (status === "RECHAZADO") return "bg-red-100 text-red-700 border-red-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

function getTimelineIconClass(status: string) {
  if (status === "APLICADO") return "bg-emerald-500 text-white";
  if (status === "APROBADO") return "bg-indigo-500 text-white";
  if (status === "RECHAZADO") return "bg-red-500 text-white";
  return "bg-slate-400 dark:bg-slate-600 text-white";
}

export default async function BodegaMovimientoDetallePage({ params }: PageProps) {
  const { id } = await params;

  const movement = await prisma.bodegaStockMovement.findUnique({
    where: { id },
    include: {
      warehouse: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      request: {
        select: {
          id: true,
          folio: true,
          statusCode: true,
        },
      },
      creator: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      approver: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      items: {
        include: {
          article: {
            select: {
              id: true,
              code: true,
              name: true,
              unit: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });

  if (!movement) {
    notFound();
  }

  const creationDateFull = new Date(movement.createdAt).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " p. m."; // Simulated AM/PM format
  const creationDateShort = new Date(movement.createdAt).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " p. m.";
  const creatorName = `${movement.creator.firstName} ${movement.creator.lastName}`;
  const isApplied = movement.status === "APLICADO";
  const displayStatus = isApplied ? "COMPLETADO" : movement.status;

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
                  No asignado
                </div>
              </div>
              <div className="space-y-1 relative">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <FileSearch className="h-3 w-3" /> REFERENCIA
                  </div>
                  <PenLine className="h-3 w-3" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {movement.request?.folio || movement.reason || "N/A"}
                </div>
              </div>

              {/* Row 2 */}
              <div className="space-y-1 relative">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> N° COTIZACIÓN
                  </div>
                  <PenLine className="h-3 w-3" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold text-slate-800 dark:text-slate-200">N/A</div>
              </div>
              <div className="space-y-1 relative">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> GUÍA DESPACHO
                  </div>
                  <PenLine className="h-3 w-3" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold text-slate-800 dark:text-slate-200">N/A</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <MapPin className="h-3 w-3" /> BODEGA ORIGEN
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {movement.movementType === "INGRESO" ? "—" : movement.warehouse.name}
                </div>
              </div>

              {/* Row 3 */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <MapPin className="h-3 w-3" /> BODEGA DESTINO
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {movement.movementType === "INGRESO" ? movement.warehouse.name : "Despacho / Consumo"}
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
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-[13px] font-medium text-slate-700 dark:text-slate-300 min-h-[80px]">
                  {movement.reason || "Sin descripción"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[12px] font-bold text-slate-500 dark:text-slate-400">Observaciones</div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-[13px] font-medium text-slate-700 dark:text-slate-300 min-h-[80px]">
                  {movement.observations || "Sin observaciones"}
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
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start gap-4">
              <div className={`p-2.5 rounded-full ${isApplied ? "bg-amber-100 dark:bg-amber-900/20" : "bg-slate-100 dark:bg-slate-800"} mt-1`}>
                <History className={`h-6 w-6 ${isApplied ? "text-amber-500 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`} />
              </div>
              <div>
                <div className="text-[17px] font-black uppercase text-slate-900 dark:text-white leading-tight mb-1">{displayStatus}</div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Act.: {creationDateShort}</div>
              </div>
            </div>

            <div className="p-5 flex-1 relative bg-slate-50/30 dark:bg-slate-900/20">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-6">HISTORIAL</div>

              <div className="relative pl-7 space-y-6">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-2 bottom-6 w-px bg-slate-200 dark:bg-slate-800" />

                {/* Event 1 */}
                <div className="relative">
                  <div className="absolute -left-7 top-1 w-6 h-6 rounded-full bg-slate-400 dark:bg-slate-600 flex items-center justify-center border-2 border-white dark:border-slate-950 shadow-sm z-10">
                    <History className="h-3 w-3 text-white" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">Movimiento Creado</span>
                      <Badge className="h-5 px-1.5 text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-none font-black tracking-wider uppercase">BORRADOR</Badge>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Iniciado por {creatorName}</div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                      <Calendar className="h-3 w-3" /> {creationDateShort}
                    </div>
                  </div>
                </div>

                {/* Event 2 (If applied) */}
                {isApplied && (
                  <div className="relative">
                    <div className="absolute -left-7 top-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white dark:border-slate-950 shadow-sm z-10">
                      <Box className="h-3 w-3 text-white" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Movimiento Ejecutado</span>
                        <Badge className="h-5 px-1.5 text-[8px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-none font-black tracking-wider uppercase">
                          EJECUTADO
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Completado por {creatorName}</div>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                        <Calendar className="h-3 w-3" /> {creationDateShort}
                      </div>
                    </div>
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
              <div className="text-xs text-slate-500 dark:text-slate-400">{movement.items.length} artículo(s) registrados</div>
            </div>
          </div>
          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 px-3 py-1 font-bold shadow-none">
            {movement.items.length} items
          </Badge>
        </CardHeader>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b dark:border-slate-800 bg-white dark:bg-slate-900/50">
                <th className="py-3 px-5 text-[11px] font-black text-slate-900 dark:text-blue-500 uppercase tracking-widest">ARTÍCULO / REPUESTO</th>
                <th className="py-3 px-5 text-[11px] font-black text-slate-900 dark:text-blue-500 uppercase tracking-widest text-center">CANTIDAD LOTE / SERIE</th>
                <th className="py-3 px-5 text-[11px] font-black text-slate-900 dark:text-blue-500 uppercase tracking-widest">VENCIMIENTO</th>
                <th className="py-3 px-5 text-[11px] font-black text-slate-900 dark:text-blue-500 uppercase tracking-widest">OBSERVACIONES</th>
                <th className="py-3 px-5 text-[11px] font-black text-slate-900 dark:text-blue-500 uppercase tracking-widest text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {movement.items.map((item, idx) => (
                <tr key={item.id} className="border-b dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="py-4 px-5">
                    <div className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{item.article.name}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">ID Artículo: {item.article.code}</div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <div className="font-black text-[15px] text-slate-900 dark:text-white">{Number(item.quantity)}</div>
                  </td>
                  <td className="py-4 px-5 text-sm font-medium text-slate-900 dark:text-slate-300">—</td>
                  <td className="py-4 px-5 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-bold border dark:border-slate-800 px-1.5 py-0.5 rounded text-[11px] uppercase bg-slate-50 dark:bg-slate-900 mr-2 text-slate-500 dark:text-slate-500">
                      {movement.movementType === "INGRESO" ? "LOTE" : "FIFO"}
                    </span>
                    De mov. {movement.folio}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 dark:hover:bg-slate-900 transition-colors">
                      <span className="font-light text-xl leading-none -mt-1">+</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Evidencia del Movimiento */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden mt-6 opacity-70 cursor-not-allowed">
        <CardHeader className="border-b dark:border-slate-800 bg-white dark:bg-slate-900/30 py-4 px-5 flex flex-row items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-3 text-[16px] font-extrabold uppercase text-slate-900 dark:text-white tracking-tight">
                EVIDENCIA DEL MOVIMIENTO
                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border-none px-2.5 py-0.5 text-xs font-bold shadow-none rounded-md">
                  0
                </Badge>
              </CardTitle>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Fotos cargadas durante el registro del movimiento</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 flex items-center justify-center min-h-[160px] bg-slate-50/50 dark:bg-slate-900/10">
          <div className="text-sm font-medium text-slate-400 dark:text-slate-600 flex flex-col items-center gap-2">
            <Camera className="h-8 w-8 text-slate-300 dark:text-slate-700" />
            No hay evidencia adjunta
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
