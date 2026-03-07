"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Check, X, Loader2, Warehouse, User, Calendar, FileText, Hash, ClipboardList, ChevronLeft, PackageCheck, Clock, Info, Package, Zap, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";
import { AprobarSolicitudDialog } from "@/components/bodega/solicitudes-internas/AprobarSolicitudDialog";
import { SeleccionOrigenModal, type OrigenSeleccionado } from "@/components/bodega/solicitudes-internas/SeleccionOrigenModal";
import { ModalRegistrarEntrega, type RegistrarEntregaFormValues } from "@/components/bodega/solicitudes-internas/ModalRegistrarEntrega";
import { cn } from "@/lib/utils";

interface RequestItemDto {
  id: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  quantity: string;
  deliveredQuantity: string;
  observations: string | null;
  // warehouseId es el ID de la bodega de origen del ítem (para consultar buckets FIFO)
  warehouseId: string;
  warehouseName: string | null;
  unit: string;
}

interface RequestLogDto {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  creatorName: string | null;
}

interface RequestDetailDto {
  id: string;
  folio: string;
  title: string;
  description: string | null;
  statusCode: string;
  statusName: string;
  priority: string;
  warehouseName: string;
  requesterName: string;
  externalReference: string | null;
  requiredDate: string | null;
  createdAt: string;
  updatedAt: string;
  items: RequestItemDto[];
  logs: RequestLogDto[];
}

interface Props {
  request: RequestDetailDto;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  BORRADOR: { bg: "bg-gray-100 dark:bg-gray-800/50", text: "text-gray-600 dark:text-gray-400", border: "border-gray-200 dark:border-gray-700", dot: "bg-gray-400" },
  PENDIENTE: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
  APROBADA: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800", dot: "bg-blue-500" },
  PREPARADA: { bg: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800", dot: "bg-indigo-500" },
  PARCIAL: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800", dot: "bg-purple-500" },
  LISTA_PARA_ENTREGA: { bg: "bg-teal-50 dark:bg-teal-950/30", text: "text-teal-700 dark:text-teal-400", border: "border-teal-200 dark:border-teal-800", dot: "bg-teal-500" },
  ENTREGADA: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" },
  RECHAZADA: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800", dot: "bg-red-500" },
  CANCELADA: { bg: "bg-slate-100 dark:bg-slate-800/50", text: "text-slate-500 dark:text-slate-400", border: "border-slate-200 dark:border-slate-700", dot: "bg-slate-400" },
};

const PRIORITY_STYLES: Record<string, { label: string; color: string }> = {
  BAJA: { label: "Baja", color: "text-slate-400 border-slate-200 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700" },
  NORMAL: { label: "Normal", color: "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800" },
  ALTA: { label: "Alta", color: "text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800" },
  URGENTE: { label: "Urgente", color: "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800" },
};

// ── Estado por ítem para el formulario de retiro ──────────────────────────────
interface ItemRetiroState {
  quantity: string;
  observations: string;
  isSubmitting: boolean;
  isDone: boolean;
  // Origen FIFO seleccionado manualmente por el usuario (null = FIFO automático)
  origenes: OrigenSeleccionado[] | null;
  showOrigenModal: boolean;
}

export default function DetalleSolicitudClient({ request }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [observation, setObservation] = useState("");

  // Diálogo de aprobación
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);

  // Modal de entrega final (LISTA_PARA_ENTREGA → ENTREGADA)
  const [entregaModalOpen, setEntregaModalOpen] = useState(false);
  const [entregaLoading, setEntregaLoading] = useState(false);

  // Generando informe PDF
  const [generandoInforme, setGenerandoInforme] = useState(false);

  // Modal "Retirar Todo"
  const [retirarTodoOpen, setRetirarTodoOpen] = useState(false);

  // Estado local de retiro por ítem (PREPARADA / PARCIAL)
  const [itemRetiroStates, setItemRetiroStates] = useState<Record<string, ItemRetiroState>>(() => {
    const initial: Record<string, ItemRetiroState> = {};
    request.items.forEach((item) => {
      const pendiente = Math.max(0, Number(item.quantity) - Number(item.deliveredQuantity));
      initial[item.id] = {
        quantity: pendiente > 0 ? String(pendiente) : "",
        observations: "",
        isSubmitting: false,
        isDone: pendiente === 0,
        origenes: null, // null = usar FIFO automático del servidor
        showOrigenModal: false,
      };
    });
    return initial;
  });

  // ── Permisos por estado ─────────────────────────────────────────────────────
  const canApproveActions = request.statusCode === "PENDIENTE";
  const canPrepare = request.statusCode === "APROBADA";
  const canWithdraw = request.statusCode === "PREPARADA" || request.statusCode === "PARCIAL";
  const canListaParaEntrega = request.statusCode === "LISTA_PARA_ENTREGA";
  const canVerInforme = request.statusCode === "ENTREGADA";
  const canEdit = ["BORRADOR", "PENDIENTE", "RECHAZADA"].includes(request.statusCode);

  const statusStyle = STATUS_STYLES[request.statusCode] ?? STATUS_STYLES["BORRADOR"];
  const priorityStyle = PRIORITY_STYLES[request.priority] ?? PRIORITY_STYLES["NORMAL"];

  // Ítems que aún no se han retirado en su totalidad
  const pendingItems = request.items.filter((item) => Number(item.deliveredQuantity) < Number(item.quantity));
  const allWithdrawn = pendingItems.length === 0;

  // ── Acciones genéricas ──────────────────────────────────────────────────────
  const executeAction = async (action: "rechazar" | "preparar" | "entregar") => {
    try {
      setIsSubmitting(true);
      const pathMap: Record<string, string> = {
        rechazar: `/api/v1/bodega/solicitudes-internas/${request.id}/rechazar`,
        preparar: `/api/v1/bodega/solicitudes-internas/${request.id}/preparar`,
        entregar: `/api/v1/bodega/solicitudes-internas/${request.id}/entregar`,
      };
      const bodyMap: Record<string, object> = {
        rechazar: { reason: observation || "Rechazo de solicitud" },
        preparar: { observations: observation || null },
        entregar: { observations: observation || null, deliverAll: true },
      };

      const response = await fetch(pathMap[action], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bodyMap[action]),
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result?.error || "No se pudo ejecutar la acción");
        return;
      }

      toast.success(action === "rechazar" ? "Solicitud rechazada" : action === "preparar" ? "Solicitud en preparación — procede al retiro de artículos" : "Entrega registrada correctamente");
      queryClient.invalidateQueries({ queryKey: ["bodega", "solicitudes-internas"] });
      router.refresh();
    } catch (error) {
      console.error("Error ejecutando acción de solicitud interna:", error);
      toast.error("Ocurrió un error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Confirmación de entrega final (firma + evidencia) ───────────────────────
  const handleConfirmarEntrega = async (data: RegistrarEntregaFormValues) => {
    setEntregaLoading(true);
    try {
      const res = await fetch(`/api/v1/bodega/solicitudes-internas/${request.id}/confirmar-entrega`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receptorNombre: data.receptorNombre,
          receptorRut: data.receptorRut || undefined,
          firmaReceptor: data.firmaReceptor,
          fotoEvidencia: data.fotoEvidencia || undefined,
          observations: data.observaciones || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result?.error || "No se pudo confirmar la entrega");
        return;
      }
      toast.success("Entrega confirmada y registrada exitosamente");
      setEntregaModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["bodega", "solicitudes-internas"] });
      router.refresh();
    } catch {
      toast.error("Ocurrió un error inesperado al confirmar la entrega");
    } finally {
      setEntregaLoading(false);
    }
  };

  // ── Retiro individual de ítem ───────────────────────────────────────────────
  const registrarRetiroItem = async (itemId: string) => {
    const state = itemRetiroStates[itemId];
    if (!state) return;

    const item = request.items.find((i) => i.id === itemId);
    if (!item) return;

    const qty = Number(state.quantity);
    const maxQty = Number(item.quantity) - Number(item.deliveredQuantity);

    if (!qty || qty <= 0 || qty > maxQty) {
      toast.error(`La cantidad debe estar entre 1 y ${maxQty}`);
      return;
    }

    setItemRetiroStates((prev) => ({ ...prev, [itemId]: { ...prev[itemId], isSubmitting: true } }));

    try {
      // Si el usuario seleccionó un origen manual, lo enviamos como sourceMovementItemId
      // (el servicio usará ese bucket directamente sin hacer FIFO automático)
      // Si hay múltiples orígenes seleccionados, enviamos un item por cada uno
      const origenManual = state.origenes;
      const itemsPayload =
        origenManual && origenManual.length > 0
          ? origenManual.map((o) => ({
              articleId: item.articleId,
              quantity: o.cantidad,
              requestItemId: itemId,
              sourceMovementItemId: o.id, // BodegaStockMovementItem.id
            }))
          : [{ articleId: item.articleId, quantity: qty, requestItemId: itemId }];

      const res = await fetch(`/api/v1/bodega/solicitudes-internas/${request.id}/entregar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          deliverAll: false,
          observations: state.observations || null,
          items: itemsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "No se pudo registrar el retiro");
        return;
      }

      toast.success(`Retiro de "${item.articleName}" registrado`);
      queryClient.invalidateQueries({ queryKey: ["bodega", "solicitudes-internas"] });
      router.refresh();
    } catch {
      toast.error("Ocurrió un error inesperado al registrar el retiro");
    } finally {
      setItemRetiroStates((prev) => ({ ...prev, [itemId]: { ...prev[itemId], isSubmitting: false } }));
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-12 bg-slate-50/30 dark:bg-transparent min-h-screen">
      <BodegaBreadcrumb
        items={[
          { label: "Bodega", href: "/bodega" },
          { label: "Solicitudes", href: "/bodega/solicitudes-internas" },
          { label: request.folio, href: "#" },
        ]}
      />

      {/* ── CABECERA ── */}
      <Card className="rounded-md border shadow-sm overflow-hidden bg-card">
        <div className="bg-orange-50/50 dark:bg-orange-950/10 px-6 py-4 border-b">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Título + folio */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                <PackageCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold uppercase tracking-tight text-gray-900 dark:text-gray-100 italic">{request.folio}</h1>
                  {/* Estado */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
                      statusStyle.bg,
                      statusStyle.text,
                      statusStyle.border,
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", statusStyle.dot)} />
                    {request.statusName}
                  </span>
                  {/* Prioridad */}
                  <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border", priorityStyle.color)}>{priorityStyle.label}</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 italic">{request.title}</p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/bodega/solicitudes-internas/${request.id}/editar`)}
                  className="h-8 text-[10px] font-bold uppercase tracking-widest rounded-md gap-1.5 dark:text-white"
                >
                  <Pencil className="w-3 h-3" /> Editar
                </Button>
              )}

              {/* ESTADO PENDIENTE: Aprobar + Rechazar */}
              {canApproveActions && (
                <>
                  <Button
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => setApproveDialogOpen(true)}
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-md gap-1.5"
                  >
                    <Check className="w-3 h-3" /> Aprobar
                  </Button>

                  <AprobarSolicitudDialog
                    requestId={request.id}
                    open={approveDialogOpen}
                    onOpenChange={setApproveDialogOpen}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ["bodega", "solicitudes-internas"] });
                      router.refresh();
                    }}
                  />

                  {/* Rechazar */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={isSubmitting} className="h-8 text-[10px] font-bold uppercase tracking-widest rounded-md gap-1.5">
                        <X className="w-3 h-3" /> Rechazar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Rechazar solicitud?</AlertDialogTitle>
                        <AlertDialogDescription>La solicitud será marcada como RECHAZADA.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <Textarea placeholder="Motivo del rechazo (obligatorio)" value={observation} onChange={(e) => setObservation(e.target.value)} className="w-full text-sm" rows={2} />
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => executeAction("rechazar")} className="bg-destructive hover:bg-destructive/90">
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Rechazo"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}

              {/* ESTADO APROBADA: Solo "Preparar" */}
              {canPrepare && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" disabled={isSubmitting} className="h-8 bg-[#283c7f] hover:bg-[#1e2e6b] text-white text-[10px] font-bold uppercase tracking-widest rounded-md gap-1.5">
                      <Package className="w-3 h-3 text-white" /> Preparar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-sm">
                    <AlertDialogHeader>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-10 h-10 rounded-md bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <AlertDialogTitle className="text-base font-black">Iniciar Preparación</AlertDialogTitle>
                      </div>
                      <AlertDialogDescription asChild>
                        <div className="space-y-3">
                          <p className="text-[13px] text-slate-600 dark:text-slate-400">¿Estás seguro de iniciar la preparación de esta solicitud?</p>
                          <div className="rounded-md border border-border bg-slate-50 dark:bg-slate-900 divide-y divide-border/60 text-[12px]">
                            <div className="flex justify-between px-4 py-2">
                              <span className="text-slate-500 font-medium">Solicitud:</span>
                              <span className="font-black">{request.folio}</span>
                            </div>
                            <div className="flex justify-between px-4 py-2">
                              <span className="text-slate-500 font-medium">Ítems:</span>
                              <span className="font-black">{request.items.length}</span>
                            </div>
                            <div className="flex justify-between px-4 py-2">
                              <span className="text-slate-500 font-medium">Cantidad total:</span>
                              <span className="font-black">{request.items.reduce((acc, i) => acc + Number(i.quantity), 0)}</span>
                            </div>
                            <div className="flex justify-between px-4 py-2 items-center">
                              <span className="text-slate-500 font-medium">Prioridad:</span>
                              <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", priorityStyle.color)}>{priorityStyle.label}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Una vez iniciada, deberás retirar todos los ítems de bodega para completar la solicitud.</span>
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="gap-1.5">
                        <X className="w-3.5 h-3.5" /> Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={() => executeAction("preparar")} disabled={isSubmitting} className="bg-[#283c7f] hover:bg-[#1e2e6b] text-white gap-1.5">
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-white" />}
                        Iniciar Preparación
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* ESTADO PREPARADA / PARCIAL: solo se muestran acciones dentro del formulario de retiro */}

              {/* ESTADO ENTREGADA: Botón para ver el informe PDF */}
              {canVerInforme && (
                <Button
                  size="sm"
                  onClick={async () => {
                    setGenerandoInforme(true);
                    try {
                      const res = await fetch(`/api/v1/bodega/solicitudes-internas/${request.id}/informe-entrega`, {
                        credentials: "include",
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        toast.error(err?.error || "Error al generar el informe");
                        return;
                      }
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                    } catch {
                      toast.error("Error inesperado al generar informe");
                    } finally {
                      setGenerandoInforme(false);
                    }
                  }}
                  disabled={generandoInforme}
                  className="bg-[#283c7f] hover:bg-[#1e2e6b] text-white gap-1.5 h-8 text-[10px] font-bold uppercase tracking-widest"
                >
                  {generandoInforme ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-white" />}
                  {generandoInforme ? "Generando..." : "Ver Informe PDF"}
                </Button>
              )}

              <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 text-[10px] font-bold uppercase tracking-widest rounded-md gap-1.5 text-slate-400 dark:text-slate-500">
                <ChevronLeft className="w-3 h-3" /> Volver
              </Button>
            </div>
          </div>
        </div>

        {/* Meta-datos */}
        <CardContent className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5">
                <Warehouse className="w-3 h-3" /> Bodega
              </label>
              <p className="text-xs font-bold uppercase text-gray-900 dark:text-gray-100">{request.warehouseName}</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5">
                <User className="w-3 h-3" /> Solicitante
              </label>
              <p className="text-xs font-bold uppercase text-gray-900 dark:text-gray-100">{request.requesterName}</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Fecha Requerida
              </label>
              <p className="text-xs font-bold uppercase text-gray-900 dark:text-gray-100">{request.requiredDate ? format(new Date(request.requiredDate), "dd-MM-yyyy", { locale: es }) : "—"}</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> Referencia
              </label>
              <p className="text-xs font-bold uppercase text-gray-900 dark:text-gray-100">{request.externalReference || "—"}</p>
            </div>

            {request.description && (
              <div className="col-span-2 lg:col-span-4 space-y-1 pt-2 border-t border-border/50">
                <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Justificación / Observaciones
                </label>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{request.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── TABLA DE ARTÍCULOS ── */}
      <Card className="rounded-md border shadow-sm overflow-hidden bg-card">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-tight flex items-center gap-2 text-gray-700 dark:text-gray-300 italic">
              Artículos Solicitados
              <Badge variant="secondary" className="text-[10px] py-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-md italic">
                {request.items.length} Registros
              </Badge>
            </h3>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">Detalle de los artículos pedidos</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow className="h-12 border-b">
                <TableHead className="w-10 text-center font-bold text-[10px] uppercase tracking-widest text-[#283c7f]">#</TableHead>
                <TableHead className="min-w-[280px] font-bold text-[10px] uppercase tracking-widest text-[#283c7f]">Artículo</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[#283c7f]">Bodega</TableHead>
                <TableHead className="text-center font-bold text-[10px] uppercase tracking-widest text-[#283c7f]">Cant. Pedida</TableHead>
                <TableHead className="text-center font-bold text-[10px] uppercase tracking-widest text-[#283c7f]">Cant. Entregada</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[#283c7f]">Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 opacity-30">
                      <Warehouse className="w-10 h-10 text-orange-400" />
                      <p className="text-[10px] font-bold uppercase tracking-widest italic">Sin artículos registrados</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                request.items.map((item, idx) => {
                  const qty = Number(item.quantity);
                  const delivered = Number(item.deliveredQuantity);
                  const isComplete = delivered >= qty && qty > 0;
                  const isPartial = delivered > 0 && delivered < qty;

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-border/60 h-16 transition-all">
                      <TableCell className="text-center text-[10px] font-bold text-gray-400 italic">{(idx + 1).toString().padStart(2, "0")}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-bold uppercase text-gray-900 dark:text-gray-100 italic">{item.articleName}</span>
                          <div className="flex items-center gap-2">
                            <code className="text-[9px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20 px-1 rounded">{item.articleCode}</code>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.unit}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-bold uppercase text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Warehouse className="w-3 h-3 text-orange-400 shrink-0" />
                          {item.warehouseName || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] font-black px-2.5 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                          {item.quantity} {item.unit}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            "text-[10px] font-black px-2.5 border-none",
                            isComplete
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : isPartial
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500",
                          )}
                        >
                          {item.deliveredQuantity} {item.unit}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">{item.observations || "—"}</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── FORMULARIO DE RETIRO POR ÍTEM (PREPARADA / PARCIAL) ── */}
      {canWithdraw && (
        <Card className="rounded-md border border-[#283c7f] shadow-sm overflow-hidden">
          {/* Header azul corporativo */}
          <div className="bg-[#283c7f] px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black uppercase text-white italic flex items-center gap-2">
                <Package className="w-4 h-4" />
                Retiro de Artículos
              </h3>
              <p className="text-[11px] text-white/70 mt-0.5">Registre el retiro de cada artículo individualmente</p>
            </div>
            {pendingItems.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setRetirarTodoOpen(true)} className="bg-white text-[#283c7f] hover:bg-white/90 gap-1.5 font-bold">
                <Zap className="w-3.5 h-3.5 fill-current" />
                Retirar Todos los Artículos
              </Button>
            )}
          </div>

          <div className="p-6 space-y-4">
            {/* Mensaje cuando ya se retiró todo */}
            {allWithdrawn ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-[13px] font-black uppercase italic text-emerald-700 dark:text-emerald-400">Todos los ítems han sido retirados</p>
                <p className="text-[11px] text-slate-500">La solicitud está lista para ser entregada.</p>

                {/* Botón entregar */}
                <AlertDialog>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Registrar entrega total?</AlertDialogTitle>
                      <AlertDialogDescription>Se marcará la solicitud como ENTREGADA en su totalidad.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea placeholder="Observaciones (opcional)" value={observation} onChange={(e) => setObservation(e.target.value)} rows={2} className="w-full text-sm" />
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => executeAction("entregar")} className="bg-[#283c7f] hover:bg-[#1e2e6b]">
                        Confirmar Entrega
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              pendingItems.map((item) => {
                const estado = itemRetiroStates[item.id];
                if (!estado) return null;
                const max = Number(item.quantity) - Number(item.deliveredQuantity);

                return (
                  <div key={item.id} className="rounded-xl border border-border bg-white dark:bg-slate-900/50 overflow-hidden">
                    {/* Sub-header del ítem */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-slate-50/60 dark:bg-slate-800/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <Package className="w-4 h-4 text-[#283c7f] dark:text-blue-400 shrink-0" />
                        <span className="text-[12px] font-black uppercase italic text-gray-900 dark:text-gray-100 truncate">{item.articleName}</span>
                      </div>
                      <code className="text-[10px] font-bold text-slate-400 shrink-0">{item.articleCode}</code>
                    </div>

                    {/* Chips de estado */}
                    <div className="flex flex-wrap gap-2 px-4 pt-3">
                      <span className="text-[10px] font-bold text-slate-500">
                        Aprobado: <strong className="text-slate-800 dark:text-slate-200">{item.quantity}</strong>
                      </span>
                      <span className="text-[10px] font-bold text-amber-600">
                        Por Retirar: <strong>{max}</strong>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600">
                        Retirado: <strong>{item.deliveredQuantity}</strong>
                      </span>
                      {item.warehouseName && (
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          Bodega: <strong>{item.warehouseName}</strong>
                        </span>
                      )}
                    </div>

                    {/* Formulario */}
                    <div className="px-4 pb-3 pt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cantidad a retirar *</label>
                        <Input
                          type="number"
                          min={1}
                          max={max}
                          placeholder="Cantidad"
                          value={estado.quantity}
                          onChange={(e) =>
                            setItemRetiroStates((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], quantity: e.target.value },
                            }))
                          }
                          className="w-full text-sm font-bold"
                          autoComplete="off"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Observaciones (opcional)</label>
                        <Input
                          type="text"
                          placeholder="Notas sobre el retiro..."
                          value={estado.observations}
                          onChange={(e) =>
                            setItemRetiroStates((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], observations: e.target.value },
                            }))
                          }
                          className="w-full text-sm"
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    {/* ── SECCIÓN ORIGEN DE STOCK / TRAZABILIDAD ── */}
                    <div className="mx-4 mb-3 flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                          <Package className="h-3 w-3 text-[#283c7f] dark:text-blue-400" />
                          Origen de Stock / Trazabilidad
                        </label>
                        {estado.origenes && estado.origenes.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[9px] text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-0"
                            onClick={() =>
                              setItemRetiroStates((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], origenes: null },
                              }))
                            }
                          >
                            Limpiar selección
                          </Button>
                        )}
                      </div>

                      {estado.origenes && estado.origenes.length > 0 ? (
                        // Origen(es) seleccionados manualmente
                        <div className="space-y-1.5">
                          {estado.origenes.map((o) => (
                            <div key={o.id} className="flex items-center gap-2 bg-white dark:bg-black border rounded px-2 py-1.5 shadow-sm text-[11px] border-[#283c7f]/30 dark:border-blue-900">
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-[9px] text-slate-400 uppercase font-bold truncate">Movimiento</span>
                                <span className="font-bold text-[#283c7f] dark:text-blue-300 truncate">{o.numeroMovimiento}</span>
                              </div>
                              {o.docRef && (
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-[9px] text-slate-400 uppercase font-bold truncate">Ref.</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300 truncate text-[10px]">{o.docRef}</span>
                                </div>
                              )}
                              <div className="flex flex-col items-end w-14 shrink-0">
                                <span className="text-[9px] text-slate-400 uppercase font-bold">Cant.</span>
                                <span className="font-bold text-[11px]">{o.cantidad}</span>
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-300 dark:border-slate-700">
                            <span className="text-[10px] font-bold text-slate-500">Total:</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] py-0 font-bold",
                                estado.origenes.reduce((a, o) => a + o.cantidad, 0) === Number(estado.quantity)
                                  ? "bg-[#283c7f] text-white border-[#283c7f]"
                                  : "text-amber-600 border-amber-200 bg-amber-50",
                              )}
                            >
                              {estado.origenes.reduce((a, o) => a + o.cantidad, 0)} / {estado.quantity || 0}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[10px] mt-0.5"
                            onClick={() => setItemRetiroStates((prev) => ({ ...prev, [item.id]: { ...prev[item.id], showOrigenModal: true } }))}
                          >
                            Modificar selección
                          </Button>
                        </div>
                      ) : Number(estado.quantity) > 0 ? (
                        // Sin selección manual — muestra aviso de FIFO automático + botón personalizar
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[9px] py-0 font-bold">
                              Sugerencia FIFO Automática (Por defecto)
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-[10px] font-bold border-[#283c7f] text-[#283c7f] hover:bg-[#283c7f] hover:text-white"
                            onClick={() => setItemRetiroStates((prev) => ({ ...prev, [item.id]: { ...prev[item.id], showOrigenModal: true } }))}
                          >
                            Personalizar Selección Manual
                          </Button>
                        </div>
                      ) : (
                        // Sin cantidad aún — botón neutro
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-[10px] text-slate-400 border-dashed justify-start"
                          onClick={() => setItemRetiroStates((prev) => ({ ...prev, [item.id]: { ...prev[item.id], showOrigenModal: true } }))}
                        >
                          <Package className="h-3.5 w-3.5 mr-2 text-slate-400" />
                          Seleccionar origen de stock (Opcional)
                        </Button>
                      )}

                      <p className="text-[9px] text-slate-400 pl-1">* Si no selecciona un origen, el sistema descontará automáticamente del stock más antiguo (FIFO).</p>
                    </div>

                    <div className="px-4 pb-4">
                      <Button
                        size="sm"
                        onClick={() => registrarRetiroItem(item.id)}
                        disabled={estado.isSubmitting || !estado.quantity}
                        className="bg-[#283c7f] hover:bg-[#1e2e6b] text-white gap-1.5 h-8 text-[10px] font-bold uppercase tracking-widest"
                      >
                        {estado.isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-white" />}
                        Registrar Retiro
                      </Button>
                    </div>

                    {/* Modal de selección de origen (trazabilidad) */}
                    {item.warehouseId && (
                      <SeleccionOrigenModal
                        open={estado.showOrigenModal}
                        onOpenChange={(v) => setItemRetiroStates((prev) => ({ ...prev, [item.id]: { ...prev[item.id], showOrigenModal: v } }))}
                        articleId={item.articleId}
                        warehouseId={item.warehouseId}
                        cantidadRequerida={Number(estado.quantity) || 0}
                        onSelect={(origenes) => setItemRetiroStates((prev) => ({ ...prev, [item.id]: { ...prev[item.id], origenes } }))}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* ── LISTA PARA ENTREGA: botón de entrega final ── */}
      {canListaParaEntrega && (
        <Card className="rounded-md border border-emerald-300 dark:border-emerald-800 shadow-sm overflow-hidden">
          <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black uppercase text-white italic flex items-center gap-2">
                <PackageCheck className="w-4 h-4" />
                Retiro Completado
              </h3>
              <p className="text-[11px] text-white/80 mt-0.5">Todos los ítems han sido retirados. Registre la entrega al receptor.</p>
            </div>
            <Button onClick={() => setEntregaModalOpen(true)} className="bg-white text-emerald-700 hover:bg-white/90 gap-2 font-black shadow-sm">
              <PackageCheck className="w-4 h-4" />
              Registrar Entrega
            </Button>
          </div>

          <div className="p-6">
            <div className="rounded-xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-black uppercase italic text-emerald-800 dark:text-emerald-300">Artículos listos para entregar al receptor</p>
                  <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70 mt-1">
                    Haga clic en “Registrar Entrega” para completar el flujo: se solicitará la firma del receptor y una foto de evidencia opcional.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── BITÁCORA ── */}
      <Card className="rounded-md border shadow-sm overflow-hidden bg-card">
        <div className="px-6 py-4 border-b">
          <h3 className="text-sm font-bold uppercase tracking-tight flex items-center gap-2 text-gray-700 dark:text-gray-300 italic">
            <ClipboardList className="w-4 h-4 text-[#283c7f] dark:text-blue-400" />
            Bitácora de Eventos
            <Badge variant="outline" className="text-[9px] py-0 bg-transparent text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700/50 rounded-full font-bold px-2 italic">
              {request.logs.length} Registros
            </Badge>
          </h3>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">Historial de cambios de estado y acciones</p>
        </div>

        <CardContent className="p-6">
          {request.logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-30 gap-3">
              <Info className="w-8 h-8 text-slate-400" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sin registros en bitácora</p>
            </div>
          ) : (
            <div className="relative space-y-0">
              {/* Línea vertical */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/50" />

              {request.logs.map((log) => (
                <div key={log.id} className="relative flex gap-4 pb-5">
                  {/* Dot */}
                  <div className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-border bg-white dark:bg-card shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-[#283c7f] dark:text-blue-400" />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-800 dark:text-gray-100">{log.action}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{log.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{format(new Date(log.createdAt), "dd-MM-yyyy HH:mm", { locale: es })}</p>
                        {log.creatorName && <p className="text-[9px] font-bold text-[#283c7f] dark:text-blue-400 uppercase tracking-wide mt-0.5">{log.creatorName}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timestamps */}
          <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Creado: {format(new Date(request.createdAt), "dd-MM-yyyy HH:mm", { locale: es })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Actualizado: {format(new Date(request.updatedAt), "dd-MM-yyyy HH:mm", { locale: es })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── MODAL: RETIRAR TODO ── */}
      <Dialog open={retirarTodoOpen} onOpenChange={setRetirarTodoOpen}>
        <DialogContent className="max-w-sm gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-base font-black uppercase flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Retirar Todo
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Esta acción registrará el retiro total de todos los artículos pendientes de esta solicitud. Se asumirá el 100% de la cantidad aprobada.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2 block">Observaciones (opcional)</label>
            <Textarea placeholder="Observaciones del retiro masivo..." value={observation} onChange={(e) => setObservation(e.target.value)} rows={2} className="w-full text-sm" autoComplete="off" />
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/30 flex gap-2">
            <Button variant="outline" onClick={() => setRetirarTodoOpen(false)} className="gap-1.5 dark:text-white">
              <X className="w-3.5 h-3.5" /> Cancelar
            </Button>
            <Button
              onClick={async () => {
                setRetirarTodoOpen(false);
                await executeAction("entregar");
              }}
              disabled={isSubmitting}
              className="bg-[#283c7f] hover:bg-[#1e2e6b] text-white gap-1.5"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-white" />}
              Sí, Retirar Todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de entrega final con firma digital */}
      <ModalRegistrarEntrega
        open={entregaModalOpen}
        onOpenChange={setEntregaModalOpen}
        folio={request.folio}
        requesterName={request.requesterName}
        items={request.items}
        onSubmit={handleConfirmarEntrega}
        loading={entregaLoading}
      />
    </div>
  );
}
