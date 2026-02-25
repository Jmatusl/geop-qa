"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { aprobarRequerimiento, solicitarRevision, aprobarRevision } from "../actions";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface WorkflowBarProps {
  requirement: any;
  permissions: {
    autoriza?: boolean;
    chequea?: boolean;
    revisa?: boolean;
    recepciona?: boolean;
  };
  className?: string;
}

export default function WorkflowBar({ requirement, permissions, className = "" }: WorkflowBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Estados para modales
  const [showAprobarModal, setShowAprobarModal] = useState(false);
  const [showSolicitarRevisionModal, setShowSolicitarRevisionModal] = useState(false);
  const [showMarcarRevisadoModal, setShowMarcarRevisadoModal] = useState(false);
  
  // Estados para formularios
  const [observaciones, setObservaciones] = useState("");
  const [respuestaRevision, setRespuestaRevision] = useState("");
  const [requiereRevision, setRequiereRevision] = useState(true);

  // Lógica de estado del workflow
  const haySolicitudRevisionPendiente = requirement.userCheckRequerido && !requirement.userCheckRequeridoAprobado;
  const yaFueRevisado = requirement.userCheckRequeridoAprobado;
  const yaEstaAprobado = requirement.isApproved;

  // Manejadores de eventos
  const handleAprobar = () => {
    startTransition(async () => {
      const result = await aprobarRequerimiento(requirement.id);
      if (result.success) {
        toast.success("Requerimiento aprobado exitosamente");
        setShowAprobarModal(false);
        router.refresh();
      } else {
        toast.error(result.error || "Error al aprobar requerimiento");
      }
    });
  };

  const handleSolicitarRevision = () => {
    if (!requiereRevision) {
      toast.error("Debe activar el switch 'Requiere Revisión'");
      return;
    }

    startTransition(async () => {
      const result = await solicitarRevision(requirement.id, observaciones);
      if (result.success) {
        toast.success("Revisión solicitada exitosamente");
        setShowSolicitarRevisionModal(false);
        setObservaciones("");
        setRequiereRevision(true);
        router.refresh();
      } else {
        toast.error(result.error || "Error al solicitar revisión");
      }
    });
  };

  const handleMarcarRevisado = () => {
    startTransition(async () => {
      const result = await aprobarRevision(requirement.id, respuestaRevision.trim() || undefined);
      if (result.success) {
        toast.success("Requerimiento marcado como revisado");
        setShowMarcarRevisadoModal(false);
        setRespuestaRevision("");
        router.refresh();
      } else {
        toast.error(result.error || "Error al marcar como revisado");
      }
    });
  };

  // Si ya está aprobado, no mostrar nada
  if (yaEstaAprobado) {
    return null;
  }

  return (
    <>
      <div className={`bg-white dark:bg-slate-900 border border-border rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Información de Estado */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-sm">Estado del Workflow</span>
            </div>
            {haySolicitudRevisionPendiente && (
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                Revisión Pendiente
              </Badge>
            )}
            {yaFueRevisado && !yaEstaAprobado && (
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                Revisado — Listo para Aprobar
              </Badge>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2">
            {/* Botón Solicitar Revisión */}
            {permissions.autoriza && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSolicitarRevisionModal(true)}
                disabled={isPending}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Solicitar Revisión</span>
              </Button>
            )}

            {/* Botón Marcar como Revisado (solo si hay solicitud pendiente) */}
            {haySolicitudRevisionPendiente && (permissions.revisa || permissions.chequea || permissions.autoriza) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMarcarRevisadoModal(true)}
                disabled={isPending}
                className="gap-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Marcar como Revisado</span>
              </Button>
            )}

            {/* Botón Aprobar Requerimiento (solo si no hay revisión pendiente) */}
            {permissions.autoriza && !haySolicitudRevisionPendiente && (
              <Button
                type="button"
                size="sm"
                onClick={() => setShowAprobarModal(true)}
                disabled={isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 text-white" />
                <span className="hidden sm:inline">Aprobar Requerimiento</span>
              </Button>
            )}

            {/* Tooltip cuando el botón aprobar está deshabilitado */}
            {permissions.autoriza && haySolicitudRevisionPendiente && (
              <div className="relative group">
                <Button
                  type="button"
                  size="sm"
                  disabled
                  className="gap-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Aprobar Requerimiento</span>
                </Button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Debe completar la revisión pendiente antes de aprobar
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Confirmar Aprobación */}
      <AlertDialog open={showAprobarModal} onOpenChange={setShowAprobarModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea aprobar este requerimiento? Esta acción marcará el requerimiento como aprobado y no podrá deshacerse fácilmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAprobar}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirmar Aprobación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Solicitar Revisión */}
      <Dialog open={showSolicitarRevisionModal} onOpenChange={setShowSolicitarRevisionModal}>
        <DialogContent className="max-w-[80vw]! w-[95vw] sm:w-[80vw]! max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader className="space-y-1">
            <DialogTitle>Solicitar Revisión</DialogTitle>
            <DialogDescription>
              Complete los campos para solicitar que este requerimiento sea revisado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {/* Alerta si ya se solicitó revisión */}
            {requirement.userCheckRequerido && (
              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <strong>Revisión ya solicitada.</strong> Al enviar nuevamente se actualizarán las observaciones.
                </AlertDescription>
              </Alert>
            )}

            {/* Resumen del Requerimiento */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Resumen del Requerimiento</h3>
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Folio</p>
                  <p className="font-medium">{requirement.folioPrefix}-{String(requirement.folio).padStart(4, "0")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha Tentativa</p>
                  <p className="font-medium">
                    {requirement.estimatedDate ? format(new Date(requirement.estimatedDate), "dd/MM/yyyy", { locale: es }) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Solicitante</p>
                  <p className="font-medium">
                    {requirement.applicant ? `${requirement.applicant.firstName} ${requirement.applicant.lastName}` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prioridad</p>
                  <p className="font-medium">{requirement.priority?.name || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge
                    className="mt-1"
                    style={{
                      backgroundColor: requirement.status?.colorHex || "#64748b",
                      color: "#fff",
                    }}
                  >
                    {requirement.status?.name || "N/A"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Tabla de Actividades */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Actividades</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Actividad</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-center">Inicio</TableHead>
                      <TableHead className="text-center">Fin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requirement.activities && requirement.activities.length > 0 ? (
                      requirement.activities.map((act: any, idx: number) => (
                        <TableRow key={act.id || idx}>
                          <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{act.name || "-"}</TableCell>
                          <TableCell>
                            {act.responsible ? `${act.responsible.firstName} ${act.responsible.lastName}` : "-"}
                          </TableCell>
                          <TableCell>
                            {act.supplier ? (act.supplier.fantasyName || act.supplier.legalName) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {act.plannedStartDate ? format(new Date(act.plannedStartDate), "dd/MM/yy") : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {act.plannedEndDate ? format(new Date(act.plannedEndDate), "dd/MM/yy") : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No hay actividades registradas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Toggle: Requiere Revisión */}
            <div className="flex items-center justify-between p-2.5 border border-border rounded-lg bg-slate-50 dark:bg-slate-900">
              <div className="flex-1">
                <Label htmlFor="requiere-revision" className="font-semibold cursor-pointer">Requiere Revisión</Label>
                <p className="text-xs text-muted-foreground mt-0">
                  Marque si solicita una revisión formal del requerimiento
                </p>
              </div>
              <Switch
                id="requiere-revision"
                checked={requiereRevision}
                onCheckedChange={setRequiereRevision}
              />
            </div>

            {/* Campo de Observaciones */}
            <div className="space-y-1.5">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Describa los aspectos que requieren revisión..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowSolicitarRevisionModal(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSolicitarRevision} disabled={isPending || !requiereRevision}>
              Solicitar Revisión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Marcar como Revisado */}
      <Dialog open={showMarcarRevisadoModal} onOpenChange={setShowMarcarRevisadoModal}>
        <DialogContent className="max-w-[80vw]! w-[95vw] sm:w-[80vw]! max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader className="space-y-1">
            <DialogTitle>Marcar como Revisado</DialogTitle>
            <DialogDescription>
              Agregue observaciones si corresponde antes de marcar este requerimiento como revisado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {/* Resumen del Requerimiento */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Resumen del Requerimiento</h3>
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Folio</p>
                  <p className="font-medium">{requirement.folioPrefix}-{String(requirement.folio).padStart(4, "0")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha Tentativa</p>
                  <p className="font-medium">
                    {requirement.estimatedDate ? format(new Date(requirement.estimatedDate), "dd/MM/yyyy", { locale: es }) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Solicitante</p>
                  <p className="font-medium">
                    {requirement.applicant ? `${requirement.applicant.firstName} ${requirement.applicant.lastName}` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prioridad</p>
                  <p className="font-medium">{requirement.priority?.name || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge
                    className="mt-1"
                    style={{
                      backgroundColor: requirement.status?.colorHex || "#64748b",
                      color: "#fff",
                    }}
                  >
                    {requirement.status?.name || "N/A"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Tabla de Actividades */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Actividades</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Actividad</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-center">Inicio</TableHead>
                      <TableHead className="text-center">Fin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requirement.activities && requirement.activities.length > 0 ? (
                      requirement.activities.map((act: any, idx: number) => (
                        <TableRow key={act.id || idx}>
                          <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{act.name || "-"}</TableCell>
                          <TableCell>
                            {act.responsible ? `${act.responsible.firstName} ${act.responsible.lastName}` : "-"}
                          </TableCell>
                          <TableCell>
                            {act.supplier ? (act.supplier.fantasyName || act.supplier.legalName) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {act.plannedStartDate ? format(new Date(act.plannedStartDate), "dd/MM/yy") : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {act.plannedEndDate ? format(new Date(act.plannedEndDate), "dd/MM/yy") : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No hay actividades registradas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Campo de Observaciones (opcional) */}
            <div className="space-y-1.5">
              <Label htmlFor="observaciones-revisado">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones-revisado"
                value={respuestaRevision}
                onChange={(e) => setRespuestaRevision(e.target.value)}
                placeholder="Agregue comentarios sobre la revisión realizada..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowMarcarRevisadoModal(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={handleMarcarRevisado} 
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Marcar como Revisado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
