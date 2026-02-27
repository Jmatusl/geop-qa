"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import {
  Mail,
  Package,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Send,
  Settings,
  Building2,
  ScanEye,
  Paperclip,
  Download,
  ShoppingCart,
  MessageSquare,
} from "lucide-react";

import { toast } from "sonner";

import { useCotizaciones, useCotizacionActions } from "@/hooks/useCotizaciones";
import { formatearRut } from "@/lib/formats";

import ApproveRejectCotizacionDialog from "./ApproveRejectCotizacionDialog";
import CotizacionDetailDialog from "./CotizacionDetailDialog";
import CotizacionItemsModal from "./CotizacionItemsModal";
import GenerarInformeDialog from "./GenerarInformeDialog";
import ManualCotizacionDialog from "./ManualCotizacionDialog";
import PreviewEmailCotizacionDialog from "./PreviewEmailCotizacionDialog";
import SendEmailCotizacionDialog from "./SendEmailCotizacionDialog";
import DialogoNumeroOrdenCompra from "./DialogoNumeroOrdenCompra";

interface Props {
  solicitudId: number;
  permisos?: {
    gestionaCotizaciones: boolean;
    apruebaCotizaciones: boolean;
    autorizaCotizaciones: boolean;
  };
}

const statusConfig = {
  PENDIENTE: { label: "Pendiente", variant: "secondary" as const, icon: Clock },
  EN_COTIZACION: { label: "En Cotización", variant: "default" as const, icon: Mail },
  RECEIVED: { label: "Recibida", variant: "outline" as const, icon: Package },
  APPROVED: { label: "Aprobada", variant: "default" as const, icon: CheckCircle, className: "bg-green-600" },
  REJECTED: { label: "Rechazada", variant: "destructive" as const, icon: XCircle },
  NO_COTIZO: { label: "No Cotizó", variant: "default" as const, icon: XCircle, className: "bg-orange-500 text-white" },
} as const;

export default function CotizacionesSection({ solicitudId, permisos }: Props) {
  // Determinar permisos con valores por defecto (true para retrocompatibilidad si no se pasan)
  const canCreateCotizacion = permisos?.gestionaCotizaciones || permisos?.apruebaCotizaciones || permisos?.autorizaCotizaciones || permisos === undefined; // Si no se pasan permisos, permitir por defecto

  // Solo el permiso 'apruebaCotizaciones' debe habilitar la acción de aprobar/rechazar.
  const canApproveCotizacion = permisos?.apruebaCotizaciones || permisos === undefined;

  const canGenerateReport = permisos?.apruebaCotizaciones || permisos?.autorizaCotizaciones || permisos === undefined;
  const [selectedCotizacion, setSelectedCotizacion] = useState<number | null>(null);
  const [adjuntosDialog, setAdjuntosDialog] = useState<{ attachments: any[]; selectedIndex: number } | null>(null);
  const [approveRejectDialog, setApproveRejectDialog] = useState<{
    cotizacionId: number;
    action: "approve" | "reject";
  } | null>(null);
  const [sendEmailDialog, setSendEmailDialog] = useState<number | null>(null);
  const [previewDialog, setPreviewDialog] = useState<number | null>(null);
  const [manualCotizacionDialog, setManualCotizacionDialog] = useState<any>(null);
  const [generarInformeDialog, setGenerarInformeDialog] = useState<number | null>(null);
  const [itemsModalDialog, setItemsModalDialog] = useState<{ cotizacionId: number; folio: string } | null>(null);
  const [revertNoCotizoDialog, setRevertNoCotizoDialog] = useState<number | null>(null);
  const [selectedParaOrdenCompra, setSelectedParaOrdenCompra] = useState<{ id: number; purchaseOrderNumber: string | null } | null>(null);

  // Debug: mostrar panel si ?debug_permisos=1
  const [debugPermisosVisible, setDebugPermisosVisible] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("debug_permisos") === "1") setDebugPermisosVisible(true);
    } catch (e) {
      // noop
    }
  }, []);

  // Hooks
  const queryClient = useQueryClient();
  const { data: cotizacionesResp, isLoading } = useCotizaciones({ solicitudId });
  const actions = useCotizacionActions();

  const cotizaciones = cotizacionesResp?.success ? cotizacionesResp.data?.cotizaciones || [] : [];

  // Listener global para abrir dialog de adjuntos desde filas de tabla
  useEffect(() => {
    const handler = (e: any) => {
      const attachments = e.detail?.attachments || [];
      // Log event details for debugging
      try {
        // eslint-disable-next-line no-console
        console.debug("openAdjuntos event received", { detail: e.detail, attachmentsLength: attachments.length });
      } catch (err) {
        // noop
      }
      if (attachments.length === 0) return;
      setAdjuntosDialog({ attachments, selectedIndex: 0 });
    };
    window.addEventListener("openAdjuntos", handler as EventListener);
    return () => window.removeEventListener("openAdjuntos", handler as EventListener);
  }, []);

  const handleManualCotizacion = async (cotizacion: any) => {
    // Obtener la cotización completa con todos los datos necesarios
    const { getCotizacionById } = await import("@/actions/solicitud-insumos/cotizacionActions");
    const result = await getCotizacionById(cotizacion.id);

    if (result.success && result.data) {
      setManualCotizacionDialog(result.data);
    } else {
      toast.error("Error al cargar la cotización");
    }
  };

  const handleManualCotizacionSuccess = () => {
    // Invalidar las queries para refrescar los datos sin recargar la página
    queryClient.invalidateQueries({ queryKey: ["cotizaciones", { solicitudId }] });
    queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
    queryClient.invalidateQueries({ queryKey: ["solicitud-insumos", solicitudId] });
    queryClient.invalidateQueries({ queryKey: ["solicitudes-insumos"] });
  };

  const changeStatusMutation = actions.changeStatus;

  const handleStatusChange = (cotizacionId: number, newStatus: string) => {
    changeStatusMutation.mutate({
      cotizacionId,
      newStatus: newStatus as any,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cotizaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando cotizaciones...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cotizaciones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cotizaciones
          </CardTitle>
          <CardDescription>No hay cotizaciones creadas para esta solicitud.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Aún no se han creado cotizaciones.</p>
            <p className="text-sm">Use el botón "Enviar a Cotización" para comenzar.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedByStatus = cotizaciones.reduce((acc: any, cotizacion: any) => {
    const status = cotizacion.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(cotizacion);
    return acc;
  }, {});

  return (
    <TooltipProvider>
      <>
        <Card className="border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden dark:bg-slate-900">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 border-b dark:border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-blue-400">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Cotizaciones
                  <Badge variant="secondary" className="ml-2 font-semibold dark:bg-slate-800 dark:text-slate-300">
                    {cotizaciones.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1.5 text-sm text-gray-600 dark:text-slate-400">Gestione las cotizaciones enviadas a proveedores para esta solicitud.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Panel de depuración opcional para verificar permisos en runtime */}
            {debugPermisosVisible && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 m-4 rounded text-sm text-yellow-800">
                <div className="font-medium">DEBUG permisos (runtime)</div>
                <pre className="text-xs mt-2">{JSON.stringify({ permisos, canCreateCotizacion, canApproveCotizacion, canGenerateReport }, null, 2)}</pre>
              </div>
            )}
            {/* Mensaje informativo para usuarios sin permisos */}
            {!canCreateCotizacion && !canApproveCotizacion && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 m-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Eye className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Modo Solo Lectura</strong>
                    </p>
                    <p className="mt-1 text-sm text-blue-600">Puedes ver las cotizaciones de esta solicitud, pero no tienes permisos para crear, editar o aprobar cotizaciones.</p>
                  </div>
                </div>
              </div>
            )}
            <Tabs defaultValue="all" className="w-full">
              <div className="px-6 pt-4 pb-3 bg-white dark:bg-slate-950 border-b dark:border-slate-800">
                <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-gray-100 dark:bg-slate-900">
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm py-2 dark:text-slate-400 dark:data-[state=active]:text-white"
                  >
                    <span className="text-xs font-medium">Todas</span>
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 dark:bg-slate-700">
                      {cotizaciones.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="PENDIENTE"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm py-2 dark:text-slate-400 dark:data-[state=active]:text-white"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    <span className="text-xs font-medium">Pendientes</span>
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 dark:bg-slate-700">
                      {groupedByStatus.PENDIENTE?.length || 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="EN_COTIZACION"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm py-2 dark:text-slate-400 dark:data-[state=active]:text-white"
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    <span className="text-xs font-medium">En Proceso</span>
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 dark:bg-slate-700">
                      {groupedByStatus.EN_COTIZACION?.length || 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="APPROVED"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm py-2 dark:text-slate-400 dark:data-[state=active]:text-white"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    <span className="text-xs font-medium">Aprobadas</span>
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 dark:bg-slate-700">
                      {groupedByStatus.APPROVED?.length || 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="REJECTED"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm py-2 dark:text-slate-400 dark:data-[state=active]:text-white"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    <span className="text-xs font-medium">Rechazadas</span>
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 dark:bg-slate-700">
                      {groupedByStatus.REJECTED?.length || 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="NO_COTIZO"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm py-2 dark:text-slate-400 dark:data-[state=active]:text-white"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    <span className="text-xs font-medium">No Cotizó</span>
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 dark:bg-slate-700">
                      {groupedByStatus.NO_COTIZO?.length || 0}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="p-0">
                <CotizacionTable
                  cotizaciones={cotizaciones}
                  onViewDetail={setSelectedCotizacion}
                  onApprove={canApproveCotizacion ? (id) => setApproveRejectDialog({ cotizacionId: id, action: "approve" }) : undefined}
                  onReject={canApproveCotizacion ? (id) => setApproveRejectDialog({ cotizacionId: id, action: "reject" }) : undefined}
                  onSendEmail={canCreateCotizacion ? setSendEmailDialog : undefined}
                  onPreview={canCreateCotizacion ? setPreviewDialog : undefined}
                  onStatusChange={canCreateCotizacion ? handleStatusChange : undefined}
                  onManualCotizacion={canCreateCotizacion ? handleManualCotizacion : undefined}
                  onOpenAdjuntos={(attachments: any[]) => setAdjuntosDialog({ attachments, selectedIndex: 0 })}
                  onGenerarInforme={canGenerateReport ? setGenerarInformeDialog : undefined}
                  onOpenItems={(cotizacionId: number, folio: string) => setItemsModalDialog({ cotizacionId, folio })}
                  onRevertNoCotizo={canCreateCotizacion ? setRevertNoCotizoDialog : undefined}
                  onAgregarOrdenCompra={canGenerateReport ? (cot) => setSelectedParaOrdenCompra(cot) : undefined}
                  canApprove={canApproveCotizacion}
                />
              </TabsContent>

              {Object.keys(statusConfig).map((status) => (
                <TabsContent key={status} value={status} className="p-0">
                  <CotizacionTable
                    cotizaciones={groupedByStatus[status] || []}
                    onViewDetail={setSelectedCotizacion}
                    onApprove={canApproveCotizacion ? (id) => setApproveRejectDialog({ cotizacionId: id, action: "approve" }) : undefined}
                    onReject={canApproveCotizacion ? (id) => setApproveRejectDialog({ cotizacionId: id, action: "reject" }) : undefined}
                    onSendEmail={canCreateCotizacion ? setSendEmailDialog : undefined}
                    onPreview={canCreateCotizacion ? setPreviewDialog : undefined}
                    onStatusChange={canCreateCotizacion ? handleStatusChange : undefined}
                    onManualCotizacion={canCreateCotizacion ? handleManualCotizacion : undefined}
                    onOpenAdjuntos={(attachments: any[]) => setAdjuntosDialog({ attachments, selectedIndex: 0 })}
                    onGenerarInforme={canGenerateReport ? setGenerarInformeDialog : undefined}
                    onOpenItems={(cotizacionId: number, folio: string) => setItemsModalDialog({ cotizacionId, folio })}
                    onRevertNoCotizo={canCreateCotizacion ? setRevertNoCotizoDialog : undefined}
                    onAgregarOrdenCompra={canGenerateReport ? (cot) => setSelectedParaOrdenCompra(cot) : undefined}
                    canApprove={canApproveCotizacion}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Dialogs */}
        {selectedCotizacion && <CotizacionDetailDialog cotizacionId={selectedCotizacion} open={!!selectedCotizacion} onOpenChange={(open: boolean) => !open && setSelectedCotizacion(null)} />}

        {approveRejectDialog && (
          <ApproveRejectCotizacionDialog
            cotizacionId={approveRejectDialog.cotizacionId}
            action={approveRejectDialog.action}
            open={!!approveRejectDialog}
            onOpenChange={(open: boolean) => !open && setApproveRejectDialog(null)}
          />
        )}

        {sendEmailDialog && <SendEmailCotizacionDialog cotizacionId={sendEmailDialog} open={!!sendEmailDialog} onOpenChange={(open: boolean) => !open && setSendEmailDialog(null)} />}

        {previewDialog && <PreviewEmailCotizacionDialog cotizacionId={previewDialog} open={!!previewDialog} onOpenChange={(open: boolean) => !open && setPreviewDialog(null)} />}

        {manualCotizacionDialog && (
          <ManualCotizacionDialog
            cotizacion={manualCotizacionDialog}
            open={!!manualCotizacionDialog}
            onOpenChange={(open: boolean) => !open && setManualCotizacionDialog(null)}
            onSuccess={handleManualCotizacionSuccess}
          />
        )}

        {generarInformeDialog && <GenerarInformeDialog cotizacionId={generarInformeDialog} open={!!generarInformeDialog} onOpenChange={(open: boolean) => !open && setGenerarInformeDialog(null)} />}

        {/* Dialog para mostrar items de una cotización */}
        {itemsModalDialog && (
          <CotizacionItemsModal
            cotizacionId={itemsModalDialog.cotizacionId}
            cotizacionFolio={itemsModalDialog.folio}
            open={!!itemsModalDialog}
            onOpenChange={(open: boolean) => !open && setItemsModalDialog(null)}
          />
        )}

        {/* Dialog para previsualizar adjuntos (imagen/pdf o lista) */}
        {adjuntosDialog && (
          <AttachmentPreviewDialog
            open={!!adjuntosDialog}
            attachments={adjuntosDialog.attachments}
            initialIndex={adjuntosDialog.selectedIndex}
            onOpenChange={(open: boolean) => {
              if (!open) setAdjuntosDialog(null);
            }}
          />
        )}

        {/* AlertDialog para confirmar revertir estado de "No Cotizó" a "Pendiente" */}
        <AlertDialog open={!!revertNoCotizoDialog} onOpenChange={(open) => !open && setRevertNoCotizoDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Revertir estado de cotización?</AlertDialogTitle>
              <AlertDialogDescription>Esta acción cambiará el estado de la cotización de "No Cotizó" a "Pendiente", permitiéndote volver a gestionarla. ¿Deseas continuar?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (revertNoCotizoDialog) {
                    handleStatusChange(revertNoCotizoDialog, "PENDIENTE");
                    setRevertNoCotizoDialog(null);
                  }
                }}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog para asignar número de orden de compra */}
        {selectedParaOrdenCompra !== null && (
          <DialogoNumeroOrdenCompra
            cotizacionId={selectedParaOrdenCompra.id}
            valorInicial={selectedParaOrdenCompra.purchaseOrderNumber}
            open={true}
            onOpenChange={(open) => {
              if (!open) setSelectedParaOrdenCompra(null);
            }}
            onSuccess={() => {
              setSelectedParaOrdenCompra(null);
              queryClient.invalidateQueries({ queryKey: ["cotizaciones", { solicitudId }] });
              queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
              queryClient.invalidateQueries({ queryKey: ["solicitud-insumos", solicitudId] });
            }}
          />
        )}
      </>
    </TooltipProvider>
  );
}

interface CotizacionTableProps {
  cotizaciones: any[];
  onViewDetail: (id: number) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onSendEmail?: (id: number) => void;
  onPreview?: (id: number) => void;
  onStatusChange?: (cotizacionId: number, newStatus: string) => void;
  onManualCotizacion?: (cotizacion: any) => void;
  onOpenAdjuntos?: (attachments: any[]) => void;
  onGenerarInforme?: (id: number) => void;
  onOpenItems?: (cotizacionId: number, folio: string) => void;
  onRevertNoCotizo?: (id: number) => void;
  onAgregarOrdenCompra?: (cotizacion: { id: number; purchaseOrderNumber: string | null }) => void;
  canApprove?: boolean;
}

function CotizacionTable({
  cotizaciones,
  onViewDetail,
  onApprove,
  onReject,
  onSendEmail,
  onPreview,
  onStatusChange,
  onManualCotizacion,
  onOpenAdjuntos,
  onGenerarInforme,
  onOpenItems,
  onRevertNoCotizo,
  onAgregarOrdenCompra,
  canApprove = true,
}: CotizacionTableProps) {
  if (cotizaciones.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-gray-50/30 dark:bg-slate-900/10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 mb-4">
          <Package className="h-8 w-8 text-gray-400 dark:text-slate-600" />
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-slate-400">No hay cotizaciones en esta categoría</p>
        <p className="text-xs text-gray-500 mt-1 dark:text-slate-500">Las cotizaciones aparecerán aquí cuando sean creadas</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Header fijo con scroll horizontal si es necesario */}
      <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-900 border-b-2 border-gray-200 dark:border-slate-800">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold text-gray-900 dark:text-slate-300 py-2.5 px-3 text-xs uppercase tracking-wider whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-gray-600 dark:text-slate-500" />
                  Folio
                </div>
              </TableHead>
              <TableHead className="font-bold text-gray-900 dark:text-slate-300 py-2.5 px-3 text-xs uppercase tracking-wider w-48">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-gray-600 dark:text-slate-500" />
                  Proveedor
                </div>
              </TableHead>
              <TableHead className="font-bold text-gray-900 dark:text-slate-300 py-2.5 px-3 text-xs uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5 text-gray-600 dark:text-slate-500" />
                  Estado
                </div>
              </TableHead>
              <TableHead className="font-bold text-gray-900 dark:text-slate-300 py-2.5 px-3 text-xs uppercase tracking-wider text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-gray-600 dark:text-slate-500" />
                  Items
                </div>
              </TableHead>
              <TableHead className="font-bold text-gray-900 dark:text-slate-300 py-2.5 px-3 text-xs uppercase tracking-wider whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-gray-600 dark:text-slate-500" />
                  F. Envío
                </div>
              </TableHead>
              <TableHead className="font-bold text-gray-900 dark:text-slate-300 py-2.5 px-3 text-xs uppercase tracking-wider whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gray-600 dark:text-slate-500" />
                  F. Límite
                </div>
              </TableHead>
              <TableHead className="font-bold text-gray-900 dark:text-slate-300 py-2.5 px-3 text-xs uppercase tracking-wider text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-gray-600 dark:text-slate-500" />
                  T. Neto
                </div>
              </TableHead>
              <TableHead className="font-bold text-gray-900 dark:text-slate-300 py-2.5 px-3 text-xs uppercase tracking-wider text-right whitespace-nowrap">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cotizaciones.map((cotizacion: any) => {
              const statusInfo = statusConfig[cotizacion.status as keyof typeof statusConfig];
              const StatusIcon = statusInfo.icon;

              return (
                <TableRow key={cotizacion.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors border-b border-gray-100 dark:border-slate-800 group">
                  <TableCell className="font-semibold py-1.5 px-3 text-sm text-gray-900 dark:text-slate-200">
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help truncate max-w-[10rem]">{cotizacion.folio}</div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-md p-0 overflow-hidden">
                          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-t-4 border-orange-500">
                            {/* Header */}
                            <div className="px-3 py-2 bg-white/80 backdrop-blur-sm border-b border-slate-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-bold text-base text-slate-900">{cotizacion.folio}</div>
                                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <ShoppingCart className="w-3 h-3" />
                                    {format(new Date(cotizacion.fechaEnvio || new Date()), "dd 'de' MMMM, yyyy", { locale: es })}
                                  </div>
                                </div>
                                <div className="ml-3">{statusInfo && <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded">{statusInfo.label}</span>}</div>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="px-1 py-1 space-y-1">
                              {/* Proveedor Info */}
                              {cotizacion.proveedor && (
                                <div className="bg-white/60 rounded-lg p-2 border border-slate-200/50">
                                  <div className="text-xs font-medium text-slate-500 mb-0.5 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    Proveedor
                                  </div>
                                  <div className="text-sm font-semibold text-slate-900">
                                    {cotizacion.proveedor.rutProveedor ? formatearRut(cotizacion.proveedor.rutProveedor) : cotizacion.proveedor.nombre}
                                  </div>
                                  {cotizacion.proveedor.razonSocial && <div className="text-xs text-gray-500 truncate capitalize leading-tight mt-0.5">{cotizacion.proveedor.razonSocial}</div>}
                                  {/* Badge para Número de Orden de Compra */}
                                  {cotizacion.purchaseOrderNumber && cotizacion.purchaseOrderNumber.trim() !== "" && (
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <span className="text-xs font-medium text-gray-600">OC:</span>
                                      <div className="inline-flex items-center gap-1 bg-gradient-to-r from-green-50 to-emerald-50 px-2 py-1 rounded-md border border-green-300 shadow-sm">
                                        <ShoppingCart className="w-3 h-3 text-green-600" />
                                        <span className="text-xs font-bold text-green-700">{cotizacion.purchaseOrderNumber}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Observaciones del Proveedor */}
                              {cotizacion.observacionesDelProveedor && (
                                <div className="bg-white/60 rounded-lg p-2 border border-slate-200/50">
                                  <div className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" />
                                    Observaciones del Proveedor
                                  </div>
                                  <div className="text-xs text-slate-600 leading-relaxed">{cotizacion.observacionesDelProveedor}</div>
                                </div>
                              )}

                              {/* Observaciones de Aprobación (solo si status es APPROVED) */}
                              {cotizacion.status === "APPROVED" && cotizacion.observacionDeAprobacion && (
                                <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                                  <div className="text-xs font-semibold text-green-900 mb-1 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                    Observaciones de Aprobación
                                  </div>
                                  <div className="text-xs text-green-800 leading-relaxed font-medium">{cotizacion.observacionDeAprobacion}</div>
                                </div>
                              )}

                              {/* Número de Orden de Compra */}
                              {cotizacion.purchaseOrderNumber && cotizacion.purchaseOrderNumber.trim() !== "" && (
                                <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                                  <div className="text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1">
                                    <ShoppingCart className="w-3 h-3 text-amber-600" />
                                    Orden de Compra
                                  </div>
                                  <div className="text-xs text-amber-800 leading-relaxed font-mono font-medium">{cotizacion.purchaseOrderNumber}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="py-1.5 px-3 w-48">
                    {cotizacion.proveedor ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <div className="font-medium text-gray-900 dark:text-slate-200 truncate text-xs">
                                {cotizacion.proveedor.rutProveedor ? formatearRut(cotizacion.proveedor.rutProveedor) : cotizacion.proveedor.nombre}
                              </div>
                              {cotizacion.proveedor.razonSocial && (
                                <div className="text-[10px] text-gray-500 dark:text-slate-500 truncate capitalize leading-tight">{cotizacion.proveedor.razonSocial.toLowerCase()}</div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1 text-xs">
                              {cotizacion.proveedor.rutProveedor && (
                                <div>
                                  <strong>RUT:</strong> {formatearRut(cotizacion.proveedor.rutProveedor)}
                                </div>
                              )}
                              {cotizacion.proveedor.nombre && (
                                <div>
                                  <strong>Nombre:</strong> {cotizacion.proveedor.nombre}
                                </div>
                              )}
                              {cotizacion.proveedor.razonSocial && (
                                <div>
                                  <strong>Razón Social:</strong> {cotizacion.proveedor.razonSocial}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-gray-400 text-xs">Cotización general</span>
                    )}
                  </TableCell>
                  <TableCell className="py-1.5 px-3">
                    {cotizacion.status === "PENDIENTE" || cotizacion.status === "EN_COTIZACION" ? (
                      <Select value={cotizacion.status} onValueChange={(newStatus) => onStatusChange?.(cotizacion.id, newStatus)}>
                        <SelectTrigger className="w-36 h-7 text-xs dark:bg-slate-900 dark:border-slate-700">
                          <SelectValue>
                            <div className="flex items-center gap-1.5">
                              <StatusIcon className="h-3 w-3" />
                              <span className="text-xs">{statusInfo.label}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDIENTE">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs">Pendiente</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="EN_COTIZACION">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3" />
                              <span className="text-xs">En Cotización</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="NO_COTIZO">
                            <div className="flex items-center gap-1.5">
                              <XCircle className="h-3 w-3" />
                              <span className="text-xs">No Cotizó</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : cotizacion.status === "NO_COTIZO" && onRevertNoCotizo ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant={statusInfo.variant}
                            className={`${(statusInfo as any).className} text-[10px] py-0.5 px-2 cursor-pointer hover:opacity-80 transition-opacity`}
                            onClick={() => onRevertNoCotizo(cotizacion.id)}
                          >
                            <StatusIcon className="mr-1 h-2.5 w-2.5" />
                            {statusInfo.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Click para cambiar a Pendiente</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant={statusInfo.variant} className={`${(statusInfo as any).className} text-[10px] py-0.5 px-2`}>
                        <StatusIcon className="mr-1 h-2.5 w-2.5" />
                        {statusInfo.label}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-1.5 px-3 text-center">
                    <button
                      onClick={() => onOpenItems?.(cotizacion.id, cotizacion.folio)}
                      className="flex items-center justify-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                      title="Click para ver detalles de items"
                    >
                      <span className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-semibold text-xs rounded-full w-6 h-6 hover:bg-blue-200 dark:hover:bg-blue-900/60 shadow-sm">
                        {cotizacion._count.items}
                      </span>
                      {cotizacion.approvedItemsCount > 0 && (
                        <span className="text-xs text-green-600 dark:text-green-500 font-medium">
                          ({cotizacion.approvedItemsCount}/{cotizacion.totalItemsCount})
                        </span>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="py-1.5 px-3 text-gray-600 dark:text-slate-500 text-xs">
                    {cotizacion.fechaEnvio ? format(new Date(cotizacion.fechaEnvio), "dd/MM/yyyy", { locale: es }) : "-"}
                  </TableCell>
                  <TableCell className="py-1.5 px-3 text-gray-600 dark:text-slate-500 text-xs">
                    {cotizacion.fechaLimiteRespuesta ? format(new Date(cotizacion.fechaLimiteRespuesta), "dd/MM/yyyy", { locale: es }) : "-"}
                  </TableCell>
                  <TableCell className="py-1.5 px-3 text-right">
                    <span className="font-semibold text-gray-900 dark:text-foreground text-xs">{cotizacion.neto ? `$${Number(cotizacion.neto).toLocaleString("es-CL")}` : "-"}</span>
                  </TableCell>

                  <TableCell className="text-right py-1.5 px-3">
                    <div className="flex items-center justify-end gap-0.5">
                      {/* Botón de adjuntos: dentro de Acciones */}
                      {(() => {
                        // Determinar si hay adjuntos por conteo o por lista incluida
                        const hasAdjuntosCount = cotizacion._count && typeof cotizacion._count.adjuntos === "number" ? cotizacion._count.adjuntos > 0 : false;
                        const hasAdjuntosList = Array.isArray(cotizacion.adjuntos) && cotizacion.adjuntos.length > 0;
                        const enabled = hasAdjuntosList || hasAdjuntosCount;
                        return <AdjuntosButton cotizacion={cotizacion} enabled={enabled} onOpenAdjuntos={onOpenAdjuntos} />;
                      })()}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetail(cotizacion.id)}
                        className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400"
                        title="Ver detalle"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>

                      {/* Botón de Preview - disponible para PENDIENTE y EN_COTIZACION */}
                      {(cotizacion.status === "PENDIENTE" || cotizacion.status === "EN_COTIZACION") && onPreview && (
                        <Button variant="ghost" size="sm" onClick={() => onPreview(cotizacion.id)} className="h-7 w-7 p-0 hover:bg-purple-100 hover:text-purple-700" title="Preview Email y PDF">
                          <ScanEye className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {cotizacion.status === "PENDIENTE" && onSendEmail && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => onSendEmail(cotizacion.id)} className="h-7 w-7 p-0 hover:bg-green-100 hover:text-green-700" title="Enviar por Email">
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                          {onManualCotizacion && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onManualCotizacion(cotizacion)}
                              className="h-7 w-7 p-0 hover:bg-orange-100 text-orange-600 hover:text-orange-700"
                              title="Ingresar Cotización Manual"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      )}

                      {cotizacion.status === "EN_COTIZACION" && onManualCotizacion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onManualCotizacion(cotizacion)}
                          className="h-7 w-7 p-0 hover:bg-orange-100 text-orange-600 hover:text-orange-700"
                          title="Ingresar Cotización Manual"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {cotizacion.status === "RECEIVED" &&
                        (() => {
                          const approveEnabled = Boolean(canApprove && typeof onApprove === "function");
                          const rejectEnabled = Boolean(canApprove && typeof onReject === "function");
                          return (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (approveEnabled) onApprove?.(cotizacion.id);
                                      }}
                                      className={`h-7 w-7 p-0 ${!approveEnabled ? "text-gray-500" : "hover:bg-green-100 text-green-600 hover:text-green-700"}`}
                                      title={!approveEnabled ? "No tienes permisos para aprobar" : "Aprobar"}
                                      disabled={!approveEnabled}
                                      aria-disabled={!approveEnabled}
                                      data-approve-enabled={approveEnabled ? "1" : "0"}
                                    >
                                      <ThumbsUp className="h-3.5 w-3.5" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">{!approveEnabled ? "No tienes permisos para aprobar" : "Aprobar"}</div>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (rejectEnabled) onReject?.(cotizacion.id);
                                      }}
                                      className={`h-7 w-7 p-0 ${!rejectEnabled ? "text-gray-500" : "hover:bg-red-100 text-red-600 hover:text-red-700"}`}
                                      title={!rejectEnabled ? "No tienes permisos para rechazar" : "Rechazar"}
                                      disabled={!rejectEnabled}
                                      aria-disabled={!rejectEnabled}
                                      data-reject-enabled={rejectEnabled ? "1" : "0"}
                                    >
                                      <ThumbsDown className="h-3.5 w-3.5" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">{!rejectEnabled ? "No tienes permisos para rechazar" : "Rechazar"}</div>
                                </TooltipContent>
                              </Tooltip>
                            </>
                          );
                        })()}

                      {cotizacion.status === "APPROVED" && onGenerarInforme && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onGenerarInforme(cotizacion.id)}
                          className="h-7 w-7 p-0 hover:bg-green-100 text-green-600 hover:text-green-700"
                          title="Enviar notificación de correo al proveedor"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Botón para agregar/editar número de orden de compra */}
                      {cotizacion.status === "APPROVED" && onAgregarOrdenCompra && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAgregarOrdenCompra({ id: cotizacion.id, purchaseOrderNumber: cotizacion.purchaseOrderNumber || null })}
                          className="h-7 w-7 p-0 hover:bg-amber-100 text-amber-600 hover:text-amber-700"
                          title="Agregar/Editar Número de Orden de Compra"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Ícono: correos enviados */}
                      {cotizacion.status === "APPROVED" && (
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={`${
                                  cotizacion.emailLog && Array.isArray(cotizacion.emailLog) && cotizacion.emailLog.length > 0 ? "text-blue-600" : "text-muted-foreground opacity-40 cursor-not-allowed"
                                }`}
                                aria-label="Correos enviados"
                                disabled={!cotizacion.emailLog || !Array.isArray(cotizacion.emailLog) || cotizacion.emailLog.length === 0}
                              >
                                <Mail className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="text-xs space-y-2 text-center">
                                {cotizacion.emailLog && Array.isArray(cotizacion.emailLog) && cotizacion.emailLog.length > 0 ? (
                                  <>
                                    <div className="font-medium">Correos enviados ({cotizacion.emailLog.length})</div>
                                    <div className="space-y-2">
                                      {cotizacion.emailLog.slice(0, 3).map((log: any, i: number) => (
                                        <div key={i}>
                                          <div className="font-semibold">{log.asunto || log.subject || "(sin asunto)"}</div>
                                          <div className="text-muted-foreground">Para: {(log.destinatarios || log.recipients || []).slice(0, 3).join(", ")}</div>
                                          <div className="text-muted-foreground">Usuario: {log.usuario || log.user || "-"}</div>
                                          <div className="text-muted-foreground">
                                            {log.createdAt ? new Date(log.createdAt).toLocaleString("es-ES") : "-"} {log.messageId ? ` • id: ${String(log.messageId).slice(0, 8)}` : ""}
                                          </div>
                                        </div>
                                      ))}
                                      {cotizacion.emailLog.length > 3 && <div className="text-muted-foreground">+{cotizacion.emailLog.length - 3} más</div>}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-muted-foreground">No se han enviado correos</div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Componente de previsualización de adjuntos (imagen / PDF)
function AttachmentPreviewDialog({ open, attachments, initialIndex = 0, onOpenChange }: { open: boolean; attachments: any[]; initialIndex?: number; onOpenChange: (open: boolean) => void }) {
  const [index, setIndex] = useState<number>(initialIndex || 0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIndex(initialIndex || 0);
  }, [initialIndex, open]);

  useEffect(() => {
    let mounted = true;
    async function fetchUrl() {
      setPreviewUrl(null);
      const att = attachments?.[index];
      if (!att) return;
      if (att.url) {
        if (mounted) setPreviewUrl(att.url);
        return;
      }
      if (!att.fileKey) return;
      setLoading(true);
      try {
        const res = await fetch("/api/cotizaciones/adjunto-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey: att.fileKey }),
        });
        const json = await res.json();
        if (json?.success && json.data?.url) {
          if (mounted) setPreviewUrl(json.data.url);
        }
      } catch (e) {
        console.error("Error fetching adjunto url:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchUrl();
    return () => {
      mounted = false;
    };
  }, [attachments, index]);

  if (!open) return null;

  const att = attachments?.[index];
  const filename = att?.filename || att?.title || att?.name || "archivo";
  const isImage = filename ? /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename) || att?.tipo === "imagen" : false;
  const isPdf = filename ? /\.pdf$/i.test(filename) || att?.tipo === "documento" : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Usar 90% de la altura de la ventana y hacer el modal más ancho */}
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium">Adjuntos</span>
              <span className="text-sm text-muted-foreground">{filename}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Download button: si hay previewUrl, permite descargar */}
              {previewUrl ? (
                <a href={previewUrl} target="_blank" rel="noreferrer" download className="inline-flex items-center justify-center text-sm px-3 py-1 rounded hover:bg-gray-100 border">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </a>
              ) : (
                <button disabled className="inline-flex items-center justify-center text-sm px-3 py-1 rounded border text-gray-300">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        {/* Usar 1/4 para la lista y 3/4 para preview para maximizar ancho del preview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(90vh-6rem)]">
          {/* Lista de adjuntos */}
          <div className="md:col-span-1 overflow-y-auto max-h-full">
            <ul className="space-y-2">
              {attachments.map((a: any, i: number) => (
                <li key={a.id || i}>
                  <button className={`w-full text-left p-2 rounded hover:bg-gray-100 ${i === index ? "bg-gray-100" : ""}`} onClick={() => setIndex(i)}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm truncate">{a.filename || a.title || `Adjunto ${i + 1}`}</div>
                      <div className="text-xs text-muted-foreground">{a.filesize ? `${Math.round(a.filesize / 1024)} KB` : ""}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Preview */}
          <div className="md:col-span-3">
            <div className="border rounded bg-white h-full overflow-auto flex items-center justify-center">
              {loading ? (
                <div className="text-sm">Cargando preview…</div>
              ) : previewUrl ? (
                isImage ? (
                  // imagen
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt={filename} className="w-full h-full object-contain" />
                ) : isPdf ? (
                  <iframe src={previewUrl} className="w-full h-full" title={filename} />
                ) : (
                  <div className="text-center">
                    <p className="text-sm">No se puede previsualizar en línea.</p>
                    <div className="mt-2">
                      <a href={previewUrl} target="_blank" rel="noreferrer" className="underline text-sm">
                        Abrir en nueva pestaña
                      </a>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-sm text-muted-foreground">No hay preview disponible</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente pequeño para el botón de adjuntos (fetch on demand si no vienen incluidos en la lista)
function AdjuntosButton({ cotizacion, enabled, onOpenAdjuntos }: { cotizacion: any; enabled: boolean; onOpenAdjuntos?: (attachments: any[]) => void }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!enabled) return;

    // Si la lista ya incluye adjuntos, abrir directamente
    if (Array.isArray(cotizacion.adjuntos) && cotizacion.adjuntos.length > 0) {
      if (typeof onOpenAdjuntos === "function") return onOpenAdjuntos(cotizacion.adjuntos || []);
      const evt = new CustomEvent("openAdjuntos", { detail: { attachments: cotizacion.adjuntos || [] } });
      return window.dispatchEvent(evt);
    }

    // Si no trae adjuntos completos, obtener la cotización por id
    setLoading(true);
    try {
      const { getCotizacionById } = await import("@/actions/solicitud-insumos/cotizacionActions");
      const res = await getCotizacionById(cotizacion.id);

      if (res?.success && Array.isArray(res.data?.adjuntos) && res.data.adjuntos.length > 0) {
        if (typeof onOpenAdjuntos === "function") return onOpenAdjuntos(res.data.adjuntos || []);
        const evt = new CustomEvent("openAdjuntos", { detail: { attachments: res.data.adjuntos || [] } });
        return window.dispatchEvent(evt);
      } else {
        // Mostrar feedback si no hay adjuntos
        // Log absence of attachments so it's clear why modal won't open
        try {
          // eslint-disable-next-line no-console
          console.debug("AdjuntosButton: no attachments found for cotizacion", { cotizacionId: cotizacion.id, res });
        } catch (err) {
          // noop
        }
        const evt = new CustomEvent("openAdjuntos", { detail: { attachments: [] } });
        return window.dispatchEvent(evt);
      }
    } catch (e) {
      console.error("Error cargando adjuntos:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`h-7 w-7 inline-flex items-center justify-center p-0 ${enabled ? "text-gray-700 hover:bg-gray-100" : "text-gray-300"} rounded`}
      onClick={handleClick}
      disabled={!enabled || loading}
      title={enabled ? "Ver adjuntos" : "Sin adjuntos"}
    >
      <Paperclip className="h-4 w-4" />
    </button>
  );
}
