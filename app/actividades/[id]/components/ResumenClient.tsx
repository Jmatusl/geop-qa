"use client";

import { useState } from "react";
import { ChevronLeft, ClipboardList, Calendar, User, MapPin, Ship, AlertCircle, FileText, MessageSquare, Clock, CheckCircle2, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatRUT } from "@/lib/utils/chile-utils";
import { toast } from "sonner";
import WorkflowBar from "./WorkflowBar";
import { EmailPdfModal } from "@/components/actividades/EmailPdfModal";

interface ResumenClientProps {
  requirement: any;
  currentUser: any;
  permissions: any;
}

export default function ResumenClient({ requirement, currentUser, permissions }: ResumenClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [showEmailPdfModal, setShowEmailPdfModal] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header de navegación móvil */}
      <div className="bg-white dark:bg-slate-900 border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3 p-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold uppercase tracking-wide text-sm truncate">
              {requirement.folioPrefix}-{String(requirement.folio).padStart(4, "0")}
            </h1>
            <p className="text-xs text-muted-foreground truncate">{requirement.title}</p>
          </div>
          <Badge
            className="shrink-0 text-xs"
            style={{
              backgroundColor: requirement.status?.colorHex || "#64748b",
              color: "#fff",
            }}
          >
            {requirement.status?.name || "N/A"}
          </Badge>
        </div>
        
        {/* Botón Enviar PDF (debajo en móvil) */}
        <div className="px-3 pb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmailPdfModal(true)}
            className="w-full gap-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
          >
            <Download className="h-4 w-4" />
            Enviar PDF Oficial
          </Button>
        </div>
      </div>

      {/* Barra de Workflow (solo móvil) */}
      <div className="p-3">
        <WorkflowBar requirement={requirement} permissions={permissions} />
      </div>

      {/* TIP de Aprobación Visual (móvil) */}
      <div className="px-3 pb-3">
        <div className="bg-linear-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-emerald-500 p-2 shrink-0">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">Requerimiento aprobado</h3>
                <Badge className="bg-emerald-600 text-white border-none text-xs">FINAL</Badge>
              </div>
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                Aprobado el {requirement.approvedAt ? format(new Date(requirement.approvedAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es }) : format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
              </p>
              {requirement.approvedBy && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  por <strong>{requirement.approvedBy.firstName} {requirement.approvedBy.lastName}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido con Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 sticky top-0 z-10 bg-white dark:bg-slate-900 rounded-none border-b">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="actividades">Actividades</TabsTrigger>
            <TabsTrigger value="adicional">Adicional</TabsTrigger>
          </TabsList>

          {/* Tab: General */}
          <TabsContent value="general" className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Información del Requerimiento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Título</p>
                    <p className="font-medium">{requirement.title}</p>
                  </div>
                </div>
                {requirement.description && (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Descripción</p>
                      <p className="text-sm text-muted-foreground">{requirement.description}</p>
                    </div>
                  </div>
                )}
                <Separator />
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Prioridad</p>
                    <Badge
                      style={{
                        backgroundColor: requirement.priority?.colorHex || "#64748b",
                        color: "#fff",
                      }}
                    >
                      {requirement.priority?.name || "N/A"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Fecha Estimada</p>
                    <p className="font-medium">
                      {requirement.estimatedDate
                        ? format(new Date(requirement.estimatedDate), "dd/MM/yyyy", { locale: es })
                        : "No especificada"}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Solicitante</p>
                    <p className="font-medium">
                      {requirement.applicant
                        ? `${requirement.applicant.firstName} ${requirement.applicant.lastName}`
                        : "No asignado"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Responsable</p>
                    <p className="font-medium">
                      {requirement.responsible
                        ? `${requirement.responsible.firstName} ${requirement.responsible.lastName}`
                        : "No asignado"}
                    </p>
                  </div>
                </div>
                <Separator />
                {requirement.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Ubicación</p>
                      <p className="font-medium">{requirement.location.name}</p>
                    </div>
                  </div>
                )}
                {requirement.ship && (
                  <div className="flex items-start gap-2">
                    <Ship className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Instalación</p>
                      <p className="font-medium">{requirement.ship.name}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Actividades */}
          <TabsContent value="actividades" className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Actividades del Requerimiento</CardTitle>
              </CardHeader>
              <CardContent>
                {requirement.activities && requirement.activities.length > 0 ? (
                  <div className="space-y-3">
                    {requirement.activities.map((act: any, idx: number) => (
                      <div key={act.id} className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-semibold text-sm">
                            {idx + 1}. {act.name || "Sin nombre"}
                          </p>
                          {act.isChecked && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Chequeado
                            </Badge>
                          )}
                        </div>
                        {act.description && (
                          <p className="text-xs text-muted-foreground mb-2">{act.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {act.activityType && (
                            <span className="flex items-center gap-1">
                              <ClipboardList className="h-3 w-3" />
                              {act.activityType.name}
                            </span>
                          )}
                          {act.responsible && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {act.responsible.firstName} {act.responsible.lastName}
                            </span>
                          )}
                          {act.supplier && (
                            <span className="flex items-center gap-1">
                              {act.supplier.fantasyName || act.supplier.legalName}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay actividades registradas</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Adicional */}
          <TabsContent value="adicional" className="p-4 space-y-4">
            {/* Observaciones de Revisión (si existen) */}
            {requirement.userCheckObservaciones && (
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Observaciones de Revisión
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold mb-1">Solicitud:</p>
                    <p className="text-sm text-blue-900 dark:text-blue-100">{requirement.userCheckObservaciones}</p>
                  </div>
                  {requirement.userCheckRequeridoAprobado && (
                    <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
                        Revisado por: {requirement.userCheckedBy?.firstName} {requirement.userCheckedBy?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {requirement.userCheckedAt && format(new Date(requirement.userCheckedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </p>
                    </div>
                  )}
                  {requirement.userCheckRequerido && !requirement.userCheckRequeridoAprobado && (
                    <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                      <Badge variant="outline" className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                        Pendiente de Revisión
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Adjuntos</CardTitle>
              </CardHeader>
              <CardContent>
                {requirement.attachments && requirement.attachments.length > 0 ? (
                  <ul className="space-y-2">
                    {requirement.attachments.map((att: any) => (
                      <li key={att.id} className="text-sm">
                        <a href={att.filePath} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {att.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin adjuntos</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Comentarios</CardTitle>
              </CardHeader>
              <CardContent>
                {requirement.comments && requirement.comments.length > 0 ? (
                  <div className="space-y-3">
                    {requirement.comments.map((comment: any) => (
                      <div key={comment.id} className="border-l-2 border-blue-500 pl-3 py-1">
                        <p className="text-xs font-semibold">
                          {comment.user.firstName} {comment.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{comment.comment}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(comment.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin comentarios</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Botones de acción inferiores (recepcionar, etc.) */}
      {permissions?.recepciona && (
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-border p-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => router.back()}>
            Volver
          </Button>
          <Button className="flex-1 bg-[#283c7f] text-white hover:bg-[#1e2d5f]">Recepcionar</Button>
        </div>
      )}

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
    </div>
  );
}
