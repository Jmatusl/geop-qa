"use client";

import { useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ClipboardList, Calendar, User, MapPin, Ship, AlertCircle, FileText, MessageSquare, Clock, CheckCircle2, Package, Download, History, ChevronDown, ChevronRight, X, Image as ImageIcon, Info } from "lucide-react";
import { formatRUT } from "@/lib/utils/chile-utils";
import WorkflowBar from "./WorkflowBar";
import { EmailPdfModal } from "@/components/actividades/EmailPdfModal";
import { ReceptionSheet } from "./ReceptionSheet";

interface ResumenDesktopProps {
  requirement: any;
  currentUser: any;
  permissions: any;
}

export default function ResumenDesktop({ requirement, currentUser, permissions }: ResumenDesktopProps) {
  const router = useRouter();
  const [showEmailPdfModal, setShowEmailPdfModal] = useState(false);
  const [receptionActivity, setReceptionActivity] = useState<any | null>(null);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; mimeType: string } | null>(null);

  const handleReceptionSuccess = () => {
    // Refrescar página para mostrar nuevos datos
    router.refresh();
  };

  return (
    <div className="w-full space-y-6">
      {/* Header de Página */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {requirement.folioPrefix}-{String(requirement.folio).padStart(4, "0")} — {requirement.title}
        </h1>
        <p className="text-muted-foreground">Resumen del requerimiento aprobado</p>
      </div>

      {/* TIP de Aprobación Visual */}
      <div className="bg-linear-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-emerald-500 p-3 shrink-0">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">Requerimiento aprobado</h3>
              <Badge className="bg-emerald-600 text-white border-none">FINAL</Badge>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 text-base text-emerald-800 dark:text-emerald-200">
              <span className="font-semibold">
                Aprobado el {requirement.approvedAt ? format(new Date(requirement.approvedAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es }) : format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
              </span>
              {requirement.approvedBy && (
                <>
                  <span className="hidden lg:inline text-emerald-600 dark:text-emerald-400">•</span>
                  <span>por <strong>{requirement.approvedBy.firstName} {requirement.approvedBy.lastName}</strong></span>
                </>
              )}
            </div>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-2">
              Este requerimiento ha sido aprobado definitivamente. Puede generar el PDF oficial o proceder con la recepción.
            </p>
          </div>
        </div>
      </div>

      {/* Header Blanco con Info Rápida */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            className="text-sm"
            style={{
              backgroundColor: requirement.status?.colorHex || "#64748b",
              color: "#fff",
            }}
          >
            {requirement.status?.name || "N/A"}
          </Badge>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {requirement.estimatedDate
                ? format(new Date(requirement.estimatedDate), "dd/MM/yyyy", { locale: es })
                : "Sin fecha"}
            </span>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>
              {requirement.responsible
                ? `${requirement.responsible.firstName} ${requirement.responsible.lastName}`
                : "Sin responsable"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Botón Enviar PDF */}
          <Button 
            variant="outline" 
            onClick={() => setShowEmailPdfModal(true)}
            className="gap-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
          >
            <Download className="h-4 w-4" />
            Enviar PDF
          </Button>

          {permissions?.recepciona && (
            <>
              <Button variant="outline" onClick={() => router.back()}>
                Volver
              </Button>
              <Button className="bg-[#283c7f] text-white hover:bg-[#1e2d5f]">Recepcionar</Button>
            </>
          )}
        </div>
      </div>

      {/* Barra de Workflow */}
      <WorkflowBar requirement={requirement} permissions={permissions} />

      {/* Card Principal con Contenido */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-6">
          {/* Panel 1: Información General */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Columna Izquierda */}
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Título
                </p>
                <p className="font-semibold">{requirement.title}</p>
              </div>
              {requirement.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Descripción
                  </p>
                  <p className="text-sm text-muted-foreground">{requirement.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Prioridad
                  </p>
                  <Badge
                    style={{
                      backgroundColor: requirement.priority?.colorHex || "#64748b",
                      color: "#fff",
                    }}
                  >
                    {requirement.priority?.name || "N/A"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Fecha Estimada
                  </p>
                  <p className="text-sm font-medium">
                    {requirement.estimatedDate
                      ? format(new Date(requirement.estimatedDate), "dd/MM/yyyy", { locale: es })
                      : "No especificada"}
                  </p>
                </div>
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="space-y-4 pl-6 border-l border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Solicitante
                </p>
                <p className="font-medium">
                  {requirement.applicant
                    ? `${requirement.applicant.firstName} ${requirement.applicant.lastName}`
                    : "No asignado"}
                </p>
                {requirement.applicant?.email && (
                  <p className="text-xs text-muted-foreground">{requirement.applicant.email}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Responsable
                </p>
                <p className="font-medium">
                  {requirement.responsible
                    ? `${requirement.responsible.firstName} ${requirement.responsible.lastName}`
                    : "No asignado"}
                </p>
                {requirement.responsible?.email && (
                  <p className="text-xs text-muted-foreground">{requirement.responsible.email}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {requirement.location && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      Ubicación
                    </p>
                    <p className="text-sm font-medium">{requirement.location.name}</p>
                  </div>
                )}
                {requirement.ship && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Ship className="h-3.5 w-3.5" />
                      Instalación
                    </p>
                    <p className="text-sm font-medium">{requirement.ship.name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Panel 2: Tabla de Actividades */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                Actividades del Requerimiento
              </h3>
              {permissions?.recepciona && requirement.activities && requirement.activities.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Aprobadas: </span>
                  <span className="font-bold text-green-600">
                    {requirement.activities.filter((act: any) => act.receptions?.some((r: any) => r.isAccepted === true)).length}
                  </span>
                  <span className="text-muted-foreground"> / {requirement.activities.length}</span>
                </div>
              )}
            </div>
            {requirement.activities && requirement.activities.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="w-80">Observaciones</TableHead>
                      {permissions?.recepciona && (
                        <>
                          <TableHead className="w-32 text-center">Estado Recepción</TableHead>
                          <TableHead className="w-32 text-center">Acciones</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requirement.activities.map((act: any, idx: number) => {
                      // Solo considerar recepcionada si tiene al menos una recepción ACEPTADA
                      const acceptedReception = act.receptions?.find((r: any) => r.isAccepted === true);
                      const rejectedReception = act.receptions?.find((r: any) => r.isAccepted === false);
                      const isReceived = !!acceptedReception;
                      const isRejected = !!rejectedReception && !acceptedReception;
                      const latestReception = acceptedReception || rejectedReception || null;
                      
                      return (
                        <Fragment key={act.id}>
                          <TableRow>
                          <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <p className="font-medium">{act.name || "Sin nombre"}</p>
                          </TableCell>
                          <TableCell>
                            {act.supplier
                              ? act.supplier.fantasyName || act.supplier.legalName
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {act.description ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 cursor-help">
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {act.description}
                                      </p>
                                      {act.description.length > 80 && (
                                        <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-md">
                                    <p className="text-sm">{act.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          {permissions?.recepciona && (
                            <>
                              <TableCell className="text-center">
                                {act.receptions && act.receptions.length > 0 ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpandedActivityId(expandedActivityId === act.id ? null : act.id)}
                                    className="flex items-center gap-1.5 text-xs"
                                  >
                                    {expandedActivityId === act.id ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                    {isReceived ? (
                                      <Badge 
                                        className="bg-green-600 text-white text-xs pointer-events-none"
                                      >
                                        ✓ Aprobado
                                      </Badge>
                                    ) : isRejected ? (
                                      <Badge 
                                        className="bg-red-600 text-white text-xs pointer-events-none"
                                      >
                                        ✗ Rechazado
                                      </Badge>
                                    ) : null}
                                    <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 pointer-events-none">
                                      {act.receptions.length}
                                    </Badge>
                                  </Button>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    Pendiente
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {isReceived ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled
                                    className="text-xs text-muted-foreground"
                                  >
                                    ✓ Aprobado
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setReceptionActivity(act)}
                                    className="text-xs"
                                  >
                                    Recepcionar
                                  </Button>
                                )}
                              </TableCell>
                            </>
                          )}
                        </TableRow>

                        {/* Fila expandible con historial de recepciones */}
                        {expandedActivityId === act.id && act.receptions && act.receptions.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={permissions?.recepciona ? 6 : 4} className="bg-slate-50 dark:bg-slate-900/50 p-6">
                              <div className="space-y-4">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                  <History className="h-4 w-4" />
                                  Historial de Recepciones ({act.receptions.length})
                                </h4>
                                
                                <div className="space-y-4">
                                  {act.receptions.map((rec: any, recIdx: number) => (
                                    <div 
                                      key={rec.id} 
                                      className="border-l-4 pl-4 py-3 space-y-3 bg-white dark:bg-slate-800 rounded-r-lg shadow-sm" 
                                      style={{ borderColor: rec.isAccepted ? '#10b981' : '#ef4444' }}
                                    >
                                      {/* Header de la recepción */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Badge 
                                            className="text-xs"
                                            style={{
                                              backgroundColor: rec.isAccepted ? '#10b981' : '#ef4444',
                                              color: 'white'
                                            }}
                                          >
                                            {rec.isAccepted ? '✓ Aprobado' : '✗ Rechazado'}
                                          </Badge>
                                          <span className="text-xs font-medium text-muted-foreground">
                                            Intento #{act.receptions.length - recIdx}
                                          </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {format(new Date(rec.receivedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                        </div>
                                      </div>

                                      {/* Usuario */}
                                      <div className="flex items-center gap-2 text-sm">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">
                                          {rec.receivedBy.firstName} {rec.receivedBy.lastName}
                                        </span>
                                      </div>

                                      {/* Comentario */}
                                      {rec.comment && (
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <MessageSquare className="h-3.5 w-3.5" />
                                            <span>Comentario:</span>
                                          </div>
                                          <p className="text-sm bg-slate-100 dark:bg-slate-700 p-3 rounded border border-border">
                                            {rec.comment}
                                          </p>
                                        </div>
                                      )}

                                      {/* Evidencias */}
                                      {rec.evidences && rec.evidences.length > 0 && (
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <ImageIcon className="h-3.5 w-3.5" />
                                            <span>Evidencias ({rec.evidences.length}):</span>
                                          </div>
                                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {rec.evidences.map((evidence: any) => (
                                              <button
                                                key={evidence.id}
                                                onClick={() => setLightboxImage({ url: evidence.publicUrl, mimeType: evidence.mimeType || 'image/jpeg' })}
                                                className="relative aspect-video rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors group"
                                              >
                                                {evidence.mimeType?.startsWith('image/') ? (
                                                  <img
                                                    src={evidence.publicUrl}
                                                    alt="Evidencia"
                                                    className="w-full h-full object-cover"
                                                  />
                                                ) : (
                                                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800">
                                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground mt-1">PDF</span>
                                                  </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                  <span className="text-white text-xs font-medium">Ver</span>
                                                </div>
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
                No hay actividades registradas
              </p>
            )}
          </div>

          <Separator className="my-6" />

          {/* Tabs de Información Adicional (Ancho Completo) */}
          <Tabs defaultValue="revision" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="revision">
                Revisión
                {requirement.userCheckObservaciones && (
                  <Badge className="ml-2 h-5 w-5 rounded-full p-0 bg-blue-500 text-[10px] text-white">!</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="adjuntos">Adjuntos</TabsTrigger>
              <TabsTrigger value="comentarios">Comentarios</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="revision" className="mt-4">
              {requirement.userCheckObservaciones ? (
                <div className="space-y-4">
                  {/* Solicitud de Revisión */}
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">Observaciones de Revisión</h3>
                    </div>
                    
                    <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                      Modal de solicitud de revisión
                    </Badge>
                    
                    {/* Mostrar evento de timeline de solicitud */}
                    {(() => {
                      const solicitudEvent = requirement.timeline?.find((e: any) => 
                        e.action === "STATUS_CHANGE" && 
                        e.comment?.includes("Solicitud de revisión:")
                      );
                      if (solicitudEvent) {
                        return (
                          <div className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                              <div className="flex-1 space-y-1">
                                {solicitudEvent.comment && (
                                  <p className="text-sm text-blue-800 dark:text-blue-200">
                                    {solicitudEvent.comment}
                                  </p>
                                )}
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  {solicitudEvent.changedBy
                                    ? `${solicitudEvent.changedBy.firstName} ${solicitudEvent.changedBy.lastName}`
                                    : "Sistema"}{" "}
                                  —{" "}
                                  {format(new Date(solicitudEvent.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Aprobación de Revisión */}
                  {requirement.userCheckRequeridoAprobado && (
                    <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6 space-y-3">
                      <Badge className="bg-emerald-500 text-white">Revisado</Badge>

                      {/* Mostrar evento de timeline de la aprobación */}
                      {(() => {
                        const revisionEvent = requirement.timeline?.find((e: any) => 
                          e.action === "STATUS_CHANGE" && 
                          e.comment?.includes("Revisión aprobada (Marcado como Revisado)")
                        );
                        if (revisionEvent) {
                          // Extraer el comentario del usuario después de "): "
                          const commentMatch = revisionEvent.comment.match(/Revisión aprobada \(Marcado como Revisado\): (.+)/);
                          const userComment = commentMatch ? commentMatch[1].trim() : null;
                          
                          return (
                            <div className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                                <div className="flex-1 space-y-1">
                                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                                    {userComment || "Se revisó sin comentarios"}
                                  </p>
                                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                    {revisionEvent.changedBy
                                      ? `${revisionEvent.changedBy.firstName} ${revisionEvent.changedBy.lastName}`
                                      : "Sistema"}{" "}
                                    —{" "}
                                    {format(new Date(revisionEvent.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  {/* Pendiente de Revisión */}
                  {requirement.userCheckRequerido && !requirement.userCheckRequeridoAprobado && (
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                      <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                        Pendiente de Revisión
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-muted-foreground">No hay observaciones de revisión registradas</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="adjuntos" className="mt-4">
              {requirement.attachments && requirement.attachments.length > 0 ? (
                <ul className="space-y-2">
                  {requirement.attachments.map((att: any) => (
                    <li key={att.id} className="flex items-center gap-2 text-sm p-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={att.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex-1"
                      >
                        {att.fileName}
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {att.uploadedBy
                          ? `${att.uploadedBy.firstName} ${att.uploadedBy.lastName}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sin adjuntos</p>
              )}
            </TabsContent>

            <TabsContent value="comentarios" className="mt-4">
              {(() => {
                // Unificar comentarios generales y de recepciones
                const allComments: any[] = [];
                
                // Comentarios generales del requerimiento
                if (requirement.comments && requirement.comments.length > 0) {
                  requirement.comments.forEach((comment: any) => {
                    allComments.push({
                      id: comment.id,
                      type: 'general',
                      comment: comment.comment,
                      user: comment.user,
                      createdAt: comment.createdAt,
                    });
                  });
                }
                
                // Comentarios de recepciones
                if (requirement.activities && requirement.activities.length > 0) {
                  requirement.activities.forEach((activity: any) => {
                    if (activity.receptions && activity.receptions.length > 0) {
                      activity.receptions.forEach((reception: any) => {
                        if (reception.comment) {
                          allComments.push({
                            id: reception.id,
                            type: 'reception',
                            comment: reception.comment,
                            user: reception.receivedBy,
                            createdAt: reception.receivedAt,
                            activityName: activity.name,
                            isAccepted: reception.isAccepted,
                          });
                        }
                      });
                    }
                  });
                }
                
                // Ordenar por fecha (más reciente primero)
                allComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                
                if (allComments.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin comentarios</p>
                  );
                }
                
                return (
                  <div className="space-y-4">
                    {allComments.map((item) => (
                      <div 
                        key={`${item.type}-${item.id}`} 
                        className={`border-l-4 pl-4 py-3 rounded-r-lg ${
                          item.type === 'general' 
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30' 
                            : item.isAccepted
                            ? 'border-green-500 bg-green-50/50 dark:bg-green-950/30'
                            : 'border-red-500 bg-red-50/50 dark:bg-red-950/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                item.type === 'general'
                                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                  : item.isAccepted
                                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
                                  : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                              }`}
                            >
                              {item.type === 'general' ? 'General' : item.isAccepted ? 'Recepción Aprobada' : 'Recepción Rechazada'}
                            </Badge>
                            {item.type === 'reception' && item.activityName && (
                              <span className="text-xs font-medium text-muted-foreground">
                                {item.activityName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                          </p>
                        </div>
                        <p className="font-semibold text-sm mb-1">
                          {item.user.firstName} {item.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.comment}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="historial" className="mt-4">
              {requirement.timeline && requirement.timeline.length > 0 ? (
                <div className="space-y-3">
                  {requirement.timeline.map((event: any) => (
                    <div key={event.id} className="flex gap-3 items-start border-l-2 border-slate-300 dark:border-slate-700 pl-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.action}</p>
                        {event.comment && (
                          <p className="text-xs text-muted-foreground">{event.comment}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.changedBy
                            ? `${event.changedBy.firstName} ${event.changedBy.lastName}`
                            : "Sistema"}{" "}
                          —{" "}
                          {format(new Date(event.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sin historial</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de Email PDF */}
      <EmailPdfModal
        open={showEmailPdfModal}
        onOpenChange={setShowEmailPdfModal}
        requirementId={requirement.id}
        requirementFolio={String(requirement.folio).padStart(4, "0")}
        requirementFolioPrefix={requirement.folioPrefix}
        providerEmail={requirement.activities?.[0]?.supplier?.contactEmail || ""}
        providerName={requirement.activities?.[0]?.supplier?.fantasyName || requirement.activities?.[0]?.supplier?.legalName || "Proveedor"}
        providerId={requirement.activities[0].supplier.id}
        providerAlternativeEmails={requirement.activities?.[0]?.supplier?.activityEmails as any || []}
      />

      {/* Sheet de Recepción */}
      {receptionActivity && (
        <ReceptionSheet
          open={!!receptionActivity}
          onOpenChange={(open) => !open && setReceptionActivity(null)}
          activity={receptionActivity}
          onSuccess={handleReceptionSuccess}
        />
      )}

      {/* Dialog Lightbox para evidencias */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0">
          <DialogHeader className="absolute top-0 right-0 z-10 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLightboxImage(null)}
              className="rounded-full bg-black/50 hover:bg-black/70 text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>
          <div className="w-full h-full flex items-center justify-center bg-black/95 rounded-lg">
            {lightboxImage && (
              lightboxImage.mimeType?.startsWith('image/') ? (
                <img
                  src={lightboxImage.url}
                  alt="Evidencia"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <iframe
                  src={lightboxImage.url}
                  className="w-full h-full"
                  title="Documento PDF"
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
