/**
 * Componente: Detalle de Solicitud de Insumos
 * Archivo: app/insumos/[id]/components/SupplyRequestDetail.tsx
 *
 * Vista rediseñada con cabecera azul corporativa, sistema de pestañas y
 * gestión completa de cotizaciones.
 */

"use client";

import React, { useState, useMemo, useCallback, useTransition, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  Package,
  BookText,
  Send,
  SendHorizonal,
  Paperclip,
  Eye,
  Pencil,
  FileText,
  Mail,
  CalendarDays,
  DollarSign,
  Settings2,
  ScanEye,
  Boxes,
  ThumbsUp,
  ThumbsDown,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  anularSolicitud,
  updateQuotationStatus,
  aprobarCotizacion,
  rechazarCotizacion,
  marcarComoNoCotizado,
} from "../actions";
import { CreateQuotationModal } from "./CreateQuotationModal";
import CotizacionDetailDialog from "./CotizacionDetailDialog";
import ManualCotizacionDialog from "./ManualCotizacionDialog";
import SendEmailCotizacionDialog from "./SendEmailCotizacionDialog";
import SendApprovalEmailDialog from "./SendApprovalEmailDialog";
import PreviewQuotationDialog from "./PreviewQuotationDialog";
import PurchaseOrderDialog from "./PurchaseOrderDialog";
import QuotationItemsModal from "./QuotationItemsModal";

/* ── Tipos ─────────────────────────────────────────────────── */
type SupplyRequest = NonNullable<
  Awaited<ReturnType<typeof import("../actions").getSupplyRequestById>>
>;

/* ── Configuración de estados de solicitud ─────────────────── */
const REQUEST_STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  PENDIENTE:   { label: "Pendiente",  icon: Clock,        className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400" },
  APROBADA:    { label: "Aprobada",   icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400" },
  PARCIAL:     { label: "Parcial",    icon: Loader2,      className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400" },
  RECHAZADA:   { label: "Rechazada",  icon: XCircle,      className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400" },
  ANULADA:     { label: "Anulada",    icon: XCircle,      className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400" },
  EN_PROCESO:  { label: "En Proceso", icon: Loader2,      className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400" },
  COMPLETADA:  { label: "Completada", icon: CheckCircle2, className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400" },
};

/* ── Configuración de estados de ítem ──────────────────────── */
const ITEM_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDIENTE:     { label: "Pendiente",     className: "bg-amber-50 text-amber-700 border-amber-200" },
  COTIZADO:      { label: "En Cotización", className: "bg-blue-50 text-blue-700 border-blue-200" },
  AUTORIZADO:    { label: "Autorizado",    className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  APROBADO:      { label: "Aprobado",      className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  RECHAZADO:     { label: "Rechazado",     className: "bg-red-50 text-red-700 border-red-200" },
  ENTREGADO:     { label: "Entregado",     className: "bg-green-50 text-green-700 border-green-200" },
  NO_DISPONIBLE: { label: "No Disponible", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

/* ── Configuración de estados de cotización ────────────────── */
const QUOTATION_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  PENDIENTE:    { label: "Pendiente",  className: "bg-amber-50 text-amber-700 border-amber-200" },
  ENVIADA:      { label: "Enviada",    className: "bg-sky-50 text-sky-700 border-sky-200" },
  RECIBIDA:     { label: "Recibida",   className: "bg-blue-50 text-blue-700 border-blue-200" },
  NO_COTIZADO:  { label: "No Cotizó", className: "bg-slate-100 text-slate-500 border-slate-200" },
  APROBADA:     { label: "Aprobada",   className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  RECHAZADA:    { label: "Rechazada",  className: "bg-red-50 text-red-700 border-red-200" },
  CANCELADA:    { label: "Cancelada",  className: "bg-orange-50 text-orange-700 border-orange-200" },
};

/* ── Helpers ────────────────────────────────────────────────── */
/** Extrae urgencia del prefijo en specifications */
function parseUrgency(specifications: string | null): {
  urgency: string;
  cleanSpec: string;
} {
  if (!specifications) return { urgency: "NORMAL", cleanSpec: "" };
  const match = specifications.match(/^\[(BAJA|ALTA|URGENTE)\]\s*/);
  if (!match) return { urgency: "NORMAL", cleanSpec: specifications };
  return { urgency: match[1], cleanSpec: specifications.slice(match[0].length) };
}

/** Badge de estado del ítem */
function ItemStatusBadge({ statusCode }: { statusCode: string }) {
  const cfg = ITEM_STATUS_CONFIG[statusCode] ?? {
    label: statusCode,
    className: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  );
}

/** Badge de urgencia */
function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, string> = {
    NORMAL:  "Normal",
    BAJA:    "Baja",
    ALTA:    "Alta",
    URGENTE: "Urgente",
  };
  const colorMap: Record<string, string> = {
    NORMAL:  "text-slate-500",
    BAJA:    "text-sky-600",
    ALTA:    "text-orange-600 font-semibold",
    URGENTE: "text-red-600 font-semibold",
  };
  return (
    <span className={cn("text-xs", colorMap[urgency] ?? "text-slate-500")}>
      {map[urgency] ?? urgency}
    </span>
  );
}

/** Formatea valor en CLP */
function formatCLP(value: number | null | undefined) {
  if (!value) return "-";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value);
}

/* ── Componente principal ─────────────────────────────────── */
interface Props {
  request: SupplyRequest;
  currentUser: {
    id: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
}

type ActiveTab = "detalles" | "cotizaciones";

export default function SupplyRequestDetail({ request, currentUser }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Inicializar tab desde query string o usar 'detalles' por defecto
  const initialTab = (searchParams.get('tab') as ActiveTab) || 'detalles';
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [quotationFilter, setQuotationFilter] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Función para cambiar de tab y actualizar la URL
  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  // Sincronizar tab cuando cambie el query string externamente
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as ActiveTab;
    if (tabFromUrl && (tabFromUrl === 'detalles' || tabFromUrl === 'cotizaciones')) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [approvalEmailDialogOpen, setApprovalEmailDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewInitialTab, setPreviewInitialTab] = useState<"email" | "pdf">("email");

  /* Estado para diálogos de acción */
  const [obsAnular, setObsAnular] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [updatingQuotation, setUpdatingQuotation] = useState<string | null>(null);

  /* Estados para aprobación/rechazo de cotizaciones */
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [noCotizadoDialogOpen, setNoCotizadoDialogOpen] = useState(false);
  const [quotationToApprove, setQuotationToApprove] = useState<string | null>(null);
  const [quotationToReject, setQuotationToReject] = useState<string | null>(null);
  const [quotationToMarkNoCotizado, setQuotationToMarkNoCotizado] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [noCotizadoReason, setNoCotizadoReason] = useState("");
  const [purchaseOrderDialogOpen, setPurchaseOrderDialogOpen] = useState(false);
  const [selectedQuotationForPO, setSelectedQuotationForPO] = useState<{id: string; currentValue: string | null} | null>(null);
  const [savingPurchaseOrder, setSavingPurchaseOrder] = useState(false);
  const [itemsModalOpen, setItemsModalOpen] = useState(false);
  const [selectedQuotationForItems, setSelectedQuotationForItems] = useState<string | null>(null);

  /* ── Datos derivados ── */
  const quotations = request.quotations ?? [];
  const selectedQuotation = useMemo(
    () => quotations.find((q: { id: string }) => q.id === selectedQuotationId) ?? null,
    [quotations, selectedQuotationId]
  );

  const quotationCounts = useMemo(() => ({
    ALL:         quotations.length,
    PENDIENTE:   quotations.filter((q: { statusCode: string }) => q.statusCode === "PENDIENTE").length,
    EN_PROCESO:  quotations.filter((q: { statusCode: string }) => ["ENVIADA", "RECIBIDA"].includes(q.statusCode)).length,
    APROBADA:    quotations.filter((q: { statusCode: string }) => q.statusCode === "APROBADA").length,
    RECHAZADA:   quotations.filter((q: { statusCode: string }) => q.statusCode === "RECHAZADA").length,
    CANCELADA:   quotations.filter((q: { statusCode: string }) => q.statusCode === "CANCELADA").length,
    NO_COTIZADO: quotations.filter((q: { statusCode: string }) => q.statusCode === "NO_COTIZADO").length,
  }), [quotations]);

  const filteredQuotations = useMemo(() => {
    if (quotationFilter === "ALL") return quotations;
    if (quotationFilter === "EN_PROCESO")
      return quotations.filter((q: { statusCode: string }) => ["ENVIADA", "RECIBIDA"].includes(q.statusCode));
    return quotations.filter((q: { statusCode: string }) => q.statusCode === quotationFilter);
  }, [quotations, quotationFilter]);

  const canCancel =
    request.statusCode === "PENDIENTE" || request.statusCode === "APROBADA";
  const canCreateQuotation = ![
    "RECHAZADA",
    "ANULADA",
    "FINALIZADA",
  ].includes(request.statusCode);

  const requestStatusCfg = REQUEST_STATUS_CONFIG[request.statusCode] ?? {
    label: request.statusCode,
    icon: Info,
    className: "bg-slate-100 text-slate-600",
  };
  const RequestStatusIcon = requestStatusCfg.icon;

  /* ── Acciones de anulación ── */
  const handleAnular = async () => {
    setLoadingAction("anular");
    const res = await anularSolicitud({ id: request.id, reason: obsAnular });
    setLoadingAction(null);
    if (res.success) {
      toast.success("Solicitud anulada");
      setObsAnular("");
    } else {
      toast.error(res.error ?? "Error al anular");
    }
  };

  /* ── Cambio de estado de cotización ── */
  const handleQuotationStatusChange = useCallback(
    async (quotationId: string, newStatus: string) => {
      setUpdatingQuotation(quotationId);
      const res = await updateQuotationStatus(quotationId, request.id, newStatus);
      setUpdatingQuotation(null);
      if (res.success) {
        toast.success("Estado actualizado");
      } else {
        toast.error(res.error ?? "Error al actualizar estado");
      }
    },
    [request.id]
  );

  /* ── Helpers de formato de fecha ── */
  const fmtDate = (d: Date | string | null | undefined) =>
    d ? format(new Date(d), "dd/MM/yy") : "-";

  const handleOpenQuotationDetail = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setDetailDialogOpen(true);
  };

  const handleOpenManualQuotation = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setManualDialogOpen(true);
  };

  const handleOpenSendEmail = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setEmailDialogOpen(true);
  };

  const handleOpenPreview = (quotationId: string, tab: "email" | "pdf") => {
    setSelectedQuotationId(quotationId);
    setPreviewInitialTab(tab);
    setPreviewDialogOpen(true);
  };

  const handleMutatingSuccess = () => {
    router.refresh();
  };

  const handleOpenApproveDialog = (quotationId: string) => {
    setQuotationToApprove(quotationId);
    setApprovalNotes("");
    setApproveDialogOpen(true);
  };

  const handleOpenRejectDialog = (quotationId: string) => {
    setQuotationToReject(quotationId);
    setRejectionNotes("");
    setRejectDialogOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!quotationToApprove) return;
    setLoadingAction("approve");
    const res = await aprobarCotizacion(quotationToApprove, request.id);
    setLoadingAction(null);
    setApproveDialogOpen(false);
    if (res.success) {
      toast.success("Cotización aprobada exitosamente");
      setApprovalNotes("");
      setQuotationToApprove(null);
      router.refresh();
    } else {
      toast.error(res.error ?? "Error al aprobar cotización");
    }
  };

  const handleConfirmRejection = async () => {
    if (!quotationToReject) return;
    if (!rejectionNotes.trim()) {
      toast.error("Debe ingresar un motivo de rechazo");
      return;
    }
    setLoadingAction("reject");
    const res = await rechazarCotizacion(quotationToReject, request.id, rejectionNotes);
    setLoadingAction(null);
    setRejectDialogOpen(false);
    if (res.success) {
      toast.success("Cotización rechazada");
      setRejectionNotes("");
      setQuotationToReject(null);
      router.refresh();
    } else {
      toast.error(res.error ?? "Error al rechazar cotización");
    }
  };

  const handleOpenNoCotizadoDialog = (quotationId: string) => {
    setQuotationToMarkNoCotizado(quotationId);
    setNoCotizadoReason("");
    setNoCotizadoDialogOpen(true);
  };

  const handleConfirmNoCotizado = async () => {
    if (!quotationToMarkNoCotizado) return;
    if (!noCotizadoReason.trim()) {
      toast.error("Debe ingresar un motivo");
      return;
    }
    setLoadingAction("noCotizado");
    const res = await marcarComoNoCotizado(quotationToMarkNoCotizado, request.id, noCotizadoReason);
    setLoadingAction(null);
    setNoCotizadoDialogOpen(false);
    if (res.success) {
      toast.success("Cotización marcada como No Cotizado");
      setNoCotizadoReason("");
      setQuotationToMarkNoCotizado(null);
      router.refresh();
    } else {
      toast.error(res.error ?? "Error al marcar como No Cotizado");
    }
  };

  /* ── Manejo de número de orden de compra ── */
  const handleOpenPurchaseOrderDialog = (quotationId: string, currentValue: string | null) => {
    setSelectedQuotationForPO({ id: quotationId, currentValue });
    setPurchaseOrderDialogOpen(true);
  };

  const handleSavePurchaseOrder = async (quotationId: string, purchaseOrderNumber: string) => {
    setSavingPurchaseOrder(true);
    // TODO: Implementar la acción para guardar el número de orden
    // const res = await savePurchaseOrderNumber(quotationId, purchaseOrderNumber);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulación
    setSavingPurchaseOrder(false);
    toast.success("Número de orden guardado");
    setPurchaseOrderDialogOpen(false);
    setSelectedQuotationForPO(null);
  };

  /* ── Enviar notificación de aprobación al proveedor ── */
  const handleSendApprovalEmail = async (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setApprovalEmailDialogOpen(true);
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="w-full">

      {/* ── CABECERA DE SOLICITUD ── */}
      <header className="bg-[#1d4ed8] dark:bg-[#1e40af] -mx-4 lg:-mx-6 -mt-3 px-4 lg:px-6 py-4 mb-0 rounded-t-none shadow-sm border-t-2 border-white/10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          {/* Lado izquierdo: back + folio + chips */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3 min-w-0">
            <button
              onClick={() => router.push('/insumos/listado')}
              className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-base lg:text-lg tracking-tight whitespace-nowrap">
                Solicitud {request.folio}
              </span>
            </button>
            {/* Chips de contexto */}
            <div className="flex items-center gap-2 flex-wrap">
              {request.installation && (
                <div className="flex items-center gap-0 rounded-md overflow-hidden border border-blue-400/40 text-xs">
                  <span className="px-2 py-1 bg-white/10 text-white/70 font-medium uppercase tracking-wide">
                    INSTALACIÓN
                  </span>
                  <span className="px-2 py-1 bg-white/20 text-white font-semibold">
                    {request.installation.name}
                  </span>
                </div>
              )}
              {request.creator && (
                <div className="flex items-center gap-0 rounded-md overflow-hidden border border-blue-400/40 text-xs">
                  <span className="px-2 py-1 bg-white/10 text-white/70 font-medium uppercase tracking-wide">
                    SOLICITANTE
                  </span>
                  <span className="px-2 py-1 bg-white/20 text-white font-semibold">
                    {request.creator.firstName} {request.creator.lastName}
                  </span>
                </div>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  requestStatusCfg.className
                )}
              >
                <RequestStatusIcon className="w-3 h-3" />
                {requestStatusCfg.label}
              </span>
            </div>
          </div>

          {/* Lado derecho: cotizaciones + acciones */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {quotations.length > 0 && (
              <span className="text-white/70 text-sm whitespace-nowrap">
                {quotations.length}{" "}
                {quotations.length === 1 ? "cotización creada" : "cotizaciones creadas"}
              </span>
            )}
            {canCreateQuotation && (
              <Button
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="bg-white/15 hover:bg-white/25 text-white border border-white/30 shadow-none"
              >
                <Send className="w-3.5 h-3.5 mr-1.5 text-white" />
                Crear Nueva Cotización
              </Button>
            )}
            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 shadow-none dark:text-white">
                    Anular
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Anular Solicitud</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción anulará <strong>{request.folio}</strong>. Debe ingresar un motivo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    placeholder="Motivo de anulación (requerido)..."
                    value={obsAnular}
                    onChange={(e) => setObsAnular(e.target.value)}
                    rows={3}
                    className="mt-2"
                    autoComplete="off"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAnular} disabled={loadingAction === "anular" || !obsAnular.trim()} className="bg-red-600 hover:bg-red-700">
                      {loadingAction === "anular" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Anular
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </header>

      {/* ── BARRA DE PESTAÑAS ── */}
      <nav className="flex -mx-4 lg:-mx-6 px-4 lg:px-6 bg-white dark:bg-slate-900 border-b border-border mb-0">
        <TabButton
          active={activeTab === "detalles"}
          onClick={() => handleTabChange("detalles")}
          icon={<BookText className="w-4 h-4" />}
          label="Detalle de Solicitud"
        />
        <TabButton
          active={activeTab === "cotizaciones"}
          onClick={() => handleTabChange("cotizaciones")}
          icon={<FileText className="w-4 h-4" />}
          label={`Cotizaciones${quotations.length > 0 ? ` (${quotations.length})` : ""}`}
        />
      </nav>

      {/* ══════════════════════════════════════════════════════
          PESTAÑA 1: DETALLE DE SOLICITUD
          ══════════════════════════════════════════════════════ */}
      {activeTab === "detalles" && (
        <div className="pt-5 space-y-4">

          {/* ── Formulario readonly ── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between px-5 py-3.5 border-b border-border gap-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Visualizar Solicitud de Insumos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  Visualizando
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {request.items.length} {request.items.length === 1 ? "ítem" : "ítems"}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ReadonlyField label="INSTALACIÓN" value={request.installation?.name ?? "—"} />
                <ReadonlyField
                  label="SOLICITANTE"
                  value={request.creator ? `${request.creator.firstName} ${request.creator.lastName}` : "—"}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ReadonlyField
                  label="FECHA SOLICITADA"
                  value={request.requestedDate ? format(new Date(request.requestedDate), "dd/MM/yyyy") : "—"}
                />
                {request.estimatedValue > 0 && (
                  <ReadonlyField label="VALOR ESTIMADO" value={formatCLP(request.estimatedValue)} />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">DESCRIPCIÓN</p>
                <div className="w-full rounded-md border border-input bg-muted/30 px-3 py-2.5 text-sm text-foreground min-h-17">
                  {request.description || request.title || "Sin descripción"}
                </div>
              </div>
              {request.justification && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">JUSTIFICACIÓN</p>
                  <div className="w-full rounded-md border border-input bg-muted/30 px-3 py-2.5 text-sm text-foreground min-h-12">
                    {request.justification}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Tabla de ítems ── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Ítems Solicitados</span>
              <span className="text-xs text-muted-foreground">
                {request.items.length} {request.items.length === 1 ? "ítem" : "ítems"}
              </span>
              {canCreateQuotation && (
                <Button
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="ml-auto bg-[#283c7f] hover:bg-[#1e2f63] text-white"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5 text-white" />
                  Cotizar
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">NOMBRE</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">CATEGORÍA</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">CANTIDAD</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">UNIDAD</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">URGENCIA</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ESTADO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {request.items.map((item: {
                    id: string;
                    specifications: string | null;
                    itemName: string;
                    category?: { name?: string | null } | null;
                    quantity: number;
                    unit: string;
                    statusCode: string;
                  }) => {
                    const { urgency } = parseUrgency(item.specifications);
                    return (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-sm max-w-44">
                          <p className="truncate">{item.itemName}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell max-w-32">
                          <p className="truncate">{item.category?.name ?? "—"}</p>
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-sm">{item.quantity}</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground uppercase hidden lg:table-cell">{item.unit}</td>
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <UrgencyBadge urgency={urgency} />
                        </td>
                        <td className="px-3 py-3">
                          <ItemStatusBadge statusCode={item.statusCode} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-2.5 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Los ítems se muestran en modo solo lectura.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          PESTAÑA 2: COTIZACIONES
          ══════════════════════════════════════════════════════ */}
      {activeTab === "cotizaciones" && (
        <div className="pt-5">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden">

            {/* Cabecera del card de cotizaciones */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between px-5 py-4 border-b border-border gap-2 bg-linear-to-r from-slate-50/80 to-slate-100/60 dark:from-slate-900 dark:to-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="font-semibold text-lg">
                    Cotizaciones{" "}
                    <span className="text-muted-foreground font-semibold text-sm">{quotations.length}</span>
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Gestione las cotizaciones enviadas a proveedores para esta solicitud.
                </p>
              </div>
              {canCreateQuotation && (
                <Button size="sm" onClick={() => setShowCreateModal(true)} className="bg-[#283c7f] hover:bg-[#1e2f63] text-white shrink-0">
                  <Send className="w-3.5 h-3.5 mr-1.5 text-white" />
                  Nueva Cotización
                </Button>
              )}
            </div>

            {/* Sub-filtros de estado */}
            <div className="border-b border-border px-5 py-3 bg-muted/20">
              <div className="flex overflow-x-auto rounded-lg bg-muted/70 p-1">
              {(
                [
                  { key: "ALL",         label: "Todas",      count: quotationCounts.ALL },
                  { key: "PENDIENTE",   label: "Pendientes", count: quotationCounts.PENDIENTE },
                  { key: "EN_PROCESO",  label: "En Proceso", count: quotationCounts.EN_PROCESO },
                  { key: "APROBADA",    label: "Aprobadas",  count: quotationCounts.APROBADA },
                  { key: "RECHAZADA",   label: "Rechazadas", count: quotationCounts.RECHAZADA },
                  { key: "NO_COTIZADO", label: "No Cotizó",  count: quotationCounts.NO_COTIZADO },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setQuotationFilter(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                    quotationFilter === tab.key
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.key === "PENDIENTE" && <Clock className="w-3.5 h-3.5" />}
                  {tab.key === "EN_PROCESO" && <SendHorizonal className="w-3.5 h-3.5" />}
                  {tab.key === "APROBADA" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {tab.key === "RECHAZADA" && <XCircle className="w-3.5 h-3.5" />}
                  {tab.key === "NO_COTIZADO" && <XCircle className="w-3.5 h-3.5" />}
                  {tab.label}
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    quotationFilter === tab.key
                      ? "bg-[#283c7f]/10 text-[#283c7f] dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
              </div>
            </div>

            {/* Contenido: vacío o tabla */}
            {filteredQuotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <FileText className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {quotations.length === 0
                    ? "No hay cotizaciones registradas aún."
                    : "No hay cotizaciones en este estado."}
                </p>
                {quotations.length === 0 && canCreateQuotation && (
                  <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Crear primera cotización
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />FOLIO</span></th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide"><span className="inline-flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />PROVEEDOR</span></th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide"><span className="inline-flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" />ESTADO</span></th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell"><span className="inline-flex items-center gap-1.5"><Boxes className="w-3.5 h-3.5" />ÍTEMS</span></th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><SendHorizonal className="w-3.5 h-3.5" />F. ENVÍO</span></th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />F. LÍMITE</span></th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />T. NETO</span></th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredQuotations.map((q: {
                      id: string;
                      folio: string;
                      supplier?: {
                        rut?: string | null;
                        businessLine?: string | null;
                        legalName?: string | null;
                        fantasyName?: string | null;
                      } | null;
                      statusCode: string;
                      itemsCount: number;
                      sentAt?: Date | string | null;
                      expirationDate?: Date | string | null;
                      totalAmount?: number | { toNumber?: () => number } | null;
                      attachments?: Array<{ id: string }>;
                    }) => (
                      <tr key={q.id} className="hover:bg-muted/20 transition-colors">
                        {/* Folio */}
                        <td className="px-4 py-3 font-mono text-xs font-semibold whitespace-nowrap">{q.folio}</td>

                        {/* Proveedor */}
                        <td className="px-4 py-3 max-w-40">
                          {q.supplier ? (
                            <div>
                              <p className="font-mono text-xs font-semibold">{q.supplier.rut}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {q.supplier.businessLine ?? q.supplier.legalName ?? q.supplier.fantasyName ?? "—"}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>

                        {/* Estado — dropdown inline */}
                        <td className="px-4 py-3">
                          <Select
                            value={q.statusCode}
                            onValueChange={(val) => handleQuotationStatusChange(q.id, val)}
                            disabled={updatingQuotation === q.id}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-7 text-xs w-36 border rounded-full px-2.5",
                                QUOTATION_STATUS_CONFIG[q.statusCode]?.className ?? "border-border"
                              )}
                            >
                              {updatingQuotation === q.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(QUOTATION_STATUS_CONFIG).map(([code, cfg]) => (
                                <SelectItem key={code} value={code} className="text-xs">
                                  {cfg.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Cantidad de ítems */}
                        <td className="px-3 py-3 text-center text-xs text-muted-foreground hidden lg:table-cell">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuotationForItems(q.id);
                              setItemsModalOpen(true);
                            }}
                            title="Ver items de esta cotización"
                            className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/60 px-2 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            {q.itemsCount}
                          </button>
                        </td>

                        {/* F. Envío */}
                        <td className="px-3 py-3 text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                          {fmtDate(q.sentAt)}
                        </td>

                        {/* F. Límite */}
                        <td className="px-3 py-3 text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                          {fmtDate(q.expirationDate)}
                        </td>

                        {/* Total neto */}
                        <td className="px-3 py-3 text-right text-xs font-medium hidden lg:table-cell whitespace-nowrap">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {formatCLP((q.totalAmount as any)?.toNumber?.() ?? (q.totalAmount as number | null))}
                        </td>

                        {/* Botones de acción */}
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <div className="relative">
                              <button
                                type="button"
                                title={q.attachments && q.attachments.length > 0 ? "Adjuntos" : "Sin adjuntos"}
                                onClick={() => {
                                  if (q.attachments && q.attachments.length > 0) {
                                    handleOpenQuotationDetail(q.id);
                                  }
                                }}
                                disabled={!q.attachments || q.attachments.length === 0}
                                className={cn(
                                  "w-7 h-7 flex items-center justify-center rounded-md transition-colors",
                                  q.attachments && q.attachments.length > 0
                                    ? "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                    : "text-slate-300 dark:text-slate-600 opacity-50 cursor-not-allowed"
                                )}
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                              </button>
                              {q.attachments && q.attachments.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#283c7f] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                                  {q.attachments.length > 9 ? "9+" : q.attachments.length}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              title="Ver detalle"
                              onClick={() => handleOpenQuotationDetail(q.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Botones para estados que no sean RECIBIDA ni APROBADA */}
                            {q.statusCode !== 'RECIBIDA' && q.statusCode !== 'APROBADA' && (
                              <>
                                <button
                                  type="button"
                                  title="Preview Email"
                                  onClick={() => handleOpenPreview(q.id, "email")}
                                  className="w-7 h-7 flex items-center justify-center rounded-md text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                                >
                                  <ScanEye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Enviar por correo"
                                  onClick={() => handleOpenSendEmail(q.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Ingresar Cotización Manual"
                                  onClick={() => handleOpenManualQuotation(q.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                {/* Botón "No Cotizó" para cotizaciones ENVIADA */}
                                {q.statusCode === 'ENVIADA' && (
                                  <button
                                    type="button"
                                    title="Marcar como No Cotizó"
                                    onClick={() => handleOpenNoCotizadoDialog(q.id)}
                                    disabled={loadingAction !== null}
                                    className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}

                            {/* Botones para estado RECIBIDA */}
                            {q.statusCode === 'RECIBIDA' && (
                              <>
                                <button
                                  type="button"
                                  title="Aprobar"
                                  onClick={() => handleOpenApproveDialog(q.id)}
                                  disabled={loadingAction !== null}
                                  className="w-7 h-7 flex items-center justify-center rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Rechazar"
                                  onClick={() => handleOpenRejectDialog(q.id)}
                                  disabled={loadingAction !== null}
                                  className="w-7 h-7 flex items-center justify-center rounded-md text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {/* Botones para estado APROBADA */}
                            {q.statusCode === 'APROBADA' && (
                              <>
                                <button
                                  type="button"
                                  title="Enviar notificación de correo al proveedor"
                                  onClick={() => handleSendApprovalEmail(q.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Agregar/Editar Número de Orden de Compra"
                                  onClick={() => handleOpenPurchaseOrderDialog(q.id, (q as any).purchaseOrderNumber || null)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                </button>
                                <TooltipProvider delayDuration={0}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className={cn(
                                          "w-7 h-7 flex items-center justify-center rounded-md",
                                          (q as any).emailLog && Array.isArray((q as any).emailLog) && (q as any).emailLog.length > 0
                                            ? "text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                            : "text-slate-300 dark:text-slate-600 opacity-40 cursor-not-allowed"
                                        )}
                                        disabled={!(q as any).emailLog || !Array.isArray((q as any).emailLog) || (q as any).emailLog.length === 0}
                                        aria-label="Correos enviados"
                                      >
                                        <Mail className="w-4 h-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <div className="text-xs space-y-2 text-center">
                                        {(q as any).emailLog && Array.isArray((q as any).emailLog) && (q as any).emailLog.length > 0 ? (
                                          <>
                                            <div className="font-medium">Correos enviados ({(q as any).emailLog.length})</div>
                                            <div className="space-y-2">
                                              {(q as any).emailLog.slice(0, 3).map((log: any, i: number) => (
                                                <div key={i}>
                                                  <div className="font-semibold">{log.asunto || log.subject || "(sin asunto)"}</div>
                                                  <div className="text-muted-foreground">Para: {(log.destinatarios || log.recipients || []).slice(0, 3).join(", ")}</div>
                                                  <div className="text-muted-foreground">Usuario: {log.usuario || log.user || "-"}</div>
                                                  <div className="text-muted-foreground">
                                                    {log.createdAt ? new Date(log.createdAt).toLocaleString("es-ES") : "-"} {log.messageId ? ` • id: ${String(log.messageId).slice(0, 8)}` : ""}
                                                  </div>
                                                </div>
                                              ))}
                                              {(q as any).emailLog.length > 3 && <div className="text-muted-foreground">+{(q as any).emailLog.length - 3} más</div>}
                                            </div>
                                          </>
                                        ) : (
                                          <div className="text-muted-foreground">No se han enviado correos</div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal de nueva cotización ── */}
      <CreateQuotationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        requestId={request.id}
        items={request.items}
      />

      <CotizacionDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        request={request}
        quotation={selectedQuotation}
      />

      <ManualCotizacionDialog
        open={manualDialogOpen}
        onOpenChange={setManualDialogOpen}
        quotation={selectedQuotation}
        onSuccess={handleMutatingSuccess}
      />

      <SendEmailCotizacionDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        quotation={
          selectedQuotation
            ? {
                id: selectedQuotation.id,
                folio: selectedQuotation.folio,
                statusCode: selectedQuotation.statusCode,
                itemsCount: selectedQuotation.itemsCount,
                supplier: selectedQuotation.supplier,
              }
            : null
        }
        onSuccess={handleMutatingSuccess}
      />

      <SendApprovalEmailDialog
        open={approvalEmailDialogOpen}
        onOpenChange={setApprovalEmailDialogOpen}
        quotationId={selectedQuotationId}
        onSuccess={handleMutatingSuccess}
      />

      {selectedQuotation && (
        <PreviewQuotationDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          request={request}
          quotation={selectedQuotation}
          initialTab={previewInitialTab}
        />
      )}

      {/* ── Modal de aprobación de cotización ── */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent className="w-[80vw]! max-w-[80vw]!">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              Aprobar Cotización
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                        Esta cotización será marcada como aprobada. Podrás enviar la notificación al proveedor.
                      </p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">
                        Una vez aprobada, podrás usar esta cotización para crear órdenes de compra.
                      </p>
                    </div>
                  </div>
                </div>
                {quotationToApprove && (() => {
                  const quotation = quotations.find((q: { id: string }) => q.id === quotationToApprove);
                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                  const neto = (quotation?.totalAmount as any)?.toNumber?.() ?? (quotation?.totalAmount as number | null) ?? 0;
                  const iva = neto * 0.19;
                  const total = neto + iva;
                  return (
                    <>
                      {/* Información básica */}
                      <div className="grid grid-cols-3 gap-4 text-sm p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Folio:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">
                            {quotation?.folio}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Número de cotización:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {(quotation as any)?.quotationNumber || "S/N"}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Proveedor:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">
                            {quotation?.supplier?.businessLine || quotation?.supplier?.legalName || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Ítems:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">
                            {quotation?.itemsCount ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Estado:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">Recibida</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Neto:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">{formatCLP(neto)}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">IVA:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">{formatCLP(iva)}</span>
                        </div>
                        <div className="col-span-3">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Total estimado:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">{formatCLP(total)}</span>
                        </div>
                      </div>

                      {/* Tabla de ítems */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Ítems en esta cotización</h4>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-100 dark:bg-slate-800">
                                <tr>
                                  <th className="text-left px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Ítem</th>
                                  <th className="text-center px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Cantidad</th>
                                  <th className="text-right px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Precio Unit.</th>
                                  <th className="text-right px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {(quotation?.items as any[])?.map((item: any) => {
                                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                  const unitPriceValue = (item.unitPrice as any)?.toNumber?.() ?? (item.unitPrice as number | null);
                                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                  const subtotalValue = (item.subtotal as any)?.toNumber?.() ?? (item.subtotal as number | null);
                                  return (
                                    <tr key={item.id} className="bg-white dark:bg-slate-900">
                                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                                        {item.requestItem?.itemName || "N/A"}
                                      </td>
                                      <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-400">
                                        {item.quotedQuantity} {item.requestItem?.unit || ""}
                                      </td>
                                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                                        {formatCLP(unitPriceValue)}
                                      </td>
                                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                                        {formatCLP(subtotalValue)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                  <td colSpan={3} className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                                    Total Cotización:
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                                    {formatCLP(neto)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Observaciones de aprobación para el proveedor (opcional)
                  </label>
                  <Textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Comentarios sobre la aprobación de esta cotización..."
                    rows={4}
                    className="resize-none"
                  />
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Este mensaje será enviado al proveedor en la notificación de aprobación.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingAction === "approve"}>Cancelar</AlertDialogCancel>
            <Button
              onClick={handleConfirmApproval}
              disabled={loadingAction === "approve"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loadingAction === "approve" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  Aprobando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-white" />
                  Aprobar Cotización
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Modal de rechazo de cotización ── */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent className="w-[80vw]! max-w-[80vw]!">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <XCircle className="w-5 h-5" />
              Rechazar Cotización
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-red-800 dark:text-red-300">
                        Esta acción marcará la cotización como rechazada. La solicitud continuará disponible para otras cotizaciones.
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400">
                        El proveedor será notificado del rechazo. La solicitud permanecerá activa.
                      </p>
                    </div>
                  </div>
                </div>
                {quotationToReject && (() => {
                  const quotation = quotations.find((q: { id: string }) => q.id === quotationToReject);
                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                  const neto = (quotation?.totalAmount as any)?.toNumber?.() ?? (quotation?.totalAmount as number | null) ?? 0;
                  const iva = neto * 0.19;
                  const total = neto + iva;
                  return (
                    <>
                      {/* Información básica */}
                      <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Folio:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">
                            {quotation?.folio}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Proveedor:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">
                            {quotation?.supplier?.businessLine || quotation?.supplier?.legalName || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Ítems:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">
                            {quotation?.itemsCount ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Estado:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">Recibida</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Neto:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">{formatCLP(neto)}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">IVA:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">{formatCLP(iva)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Total estimado:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">{formatCLP(total)}</span>
                        </div>
                      </div>

                      {/* Tabla de ítems */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Ítems en esta cotización</h4>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-100 dark:bg-slate-800">
                                <tr>
                                  <th className="text-left px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Ítem</th>
                                  <th className="text-center px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Cantidad</th>
                                  <th className="text-right px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Precio Unit.</th>
                                  <th className="text-right px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {(quotation?.items as any[])?.map((item: any) => {
                                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                  const unitPriceValue = (item.unitPrice as any)?.toNumber?.() ?? (item.unitPrice as number | null);
                                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                  const subtotalValue = (item.subtotal as any)?.toNumber?.() ?? (item.subtotal as number | null);
                                  return (
                                    <tr key={item.id} className="bg-white dark:bg-slate-900">
                                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                                        {item.requestItem?.itemName || "N/A"}
                                      </td>
                                      <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-400">
                                        {item.quotedQuantity} {item.requestItem?.unit || ""}
                                      </td>
                                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                                        {formatCLP(unitPriceValue)}
                                      </td>
                                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                                        {formatCLP(subtotalValue)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                  <td colSpan={3} className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                                    Total Cotización:
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                                    {formatCLP(neto)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Motivo del rechazo (opcional)
                  </label>
                  <Textarea
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    placeholder="Explique por qué se rechaza esta cotización..."
                    rows={4}
                    className="resize-none"
                  />
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Este mensaje será enviado al proveedor en la notificación de rechazo.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingAction === "reject"}>Cancelar</AlertDialogCancel>
            <Button
              onClick={handleConfirmRejection}
              disabled={loadingAction === "reject"}
              variant="destructive"
            >
              {loadingAction === "reject" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rechazando...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar Cotización
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Modal de "No Cotizó" ── */}
      <AlertDialog open={noCotizadoDialogOpen} onOpenChange={setNoCotizadoDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <XCircle className="w-5 h-5" />
              Marcar como No Cotizó
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-800 dark:text-amber-300">
                        El proveedor no respondió o no cotiza estos productos
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Esta acción marcará la cotización como "No Cotizado" y permitirá gestionar otros proveedores.
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={noCotizadoReason}
                    onChange={(e) => setNoCotizadoReason(e.target.value)}
                    placeholder="Ej: Proveedor no responde a solicitudes / No tiene stock / No cotiza estos productos..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingAction === "noCotizado"}>Cancelar</AlertDialogCancel>
            <Button
              onClick={handleConfirmNoCotizado}
              disabled={loadingAction === "noCotizado" || !noCotizadoReason.trim()}
              variant="outline"
            >
              {loadingAction === "noCotizado" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Marcar como No Cotizó
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Modal de número de orden de compra ── */}
      <PurchaseOrderDialog
        quotationId={selectedQuotationForPO?.id || null}
        currentValue={selectedQuotationForPO?.currentValue || null}
        open={purchaseOrderDialogOpen}
        onOpenChange={setPurchaseOrderDialogOpen}
        onSave={handleSavePurchaseOrder}
        saving={savingPurchaseOrder}
      />

      {/* ── Modal de items de cotización ── */}
      <QuotationItemsModal
        quotationId={selectedQuotationForItems}
        open={itemsModalOpen}
        onOpenChange={setItemsModalOpen}
      />
    </div>
  );
}

/* ── Sub-componentes helper ─────────────────────────────────── */

/** Botón de pestaña */
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors",
        active
          ? "border-[#283c7f] text-[#283c7f] dark:text-blue-400"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/** Campo de formulario solo lectura */
function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-foreground">
        {value}
      </div>
    </div>
  );
}

/** Botón icono de acción en tabla de cotizaciones */
function IconActionButton({
  icon,
  label,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        title={label}
        onClick={onClick}
        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {icon}
      </button>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#283c7f] text-white text-[9px] font-bold flex items-center justify-center leading-none">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </div>
  );
}

