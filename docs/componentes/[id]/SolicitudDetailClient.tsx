"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Package, Send, FileText, ArrowLeft, Ship, User } from "lucide-react";
import SolicitudReadOnlyForm from "../components/SolicitudReadOnlyForm";
import CotizacionesSection from "../components/CotizacionesSection";
import SendToQuoteDialog from "../components/SendToQuoteDialog";
import RejectedSolicitudAlert from "../components/RejectedSolicitudAlert";

interface Props {
  solicitudId: number;
  solicitud: any;
  proveedores?: Array<{ id: number; nombre: string; email?: string }>;
  bodegas?: Array<{ id: number; name: string }>;
  usuarios?: Array<{ id: number; username: string; email: string }>;
  permisos: {
    gestionaCotizaciones: boolean;
    apruebaCotizaciones: boolean;
    autorizaCotizaciones: boolean;
  };
  selectShips: {
    isAllowed: boolean;
    shipId?: number | null;
    userOnShip?: any[];
  };
}

export default function SolicitudDetailClient({ solicitudId, solicitud, proveedores = [], bodegas = [], usuarios = [], permisos, selectShips }: Props) {
  const [sendToQuoteOpen, setSendToQuoteOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Obtener el parámetro 'tab' de la URL, si existe
  const tabFromUrl = searchParams.get("tab");

  // Determinar el tab inicial: si viene 'cotizaciones' en URL y hay cotizaciones, usarlo; si no, 'detalle'
  const defaultTab = tabFromUrl === "cotizaciones" && (solicitud.cotizaciones?.length || 0) > 0 ? "cotizaciones" : "detalle";

  // Filtrar items que pueden ser enviados a cotización (memorizado)
  // Permitir items PENDIENTES y EN_COTIZACION para nuevas cotizaciones
  const availableItems = useMemo(() => {
    return solicitud.items?.filter((item: any) => item.status === "PENDIENTE" || item.status === "EN_COTIZACION") || [];
  }, [solicitud.items]);

  // Determinar si el usuario tiene algún permiso de cotizaciones
  const hasAnyCotizacionPermiso = useMemo(() => {
    return permisos.gestionaCotizaciones || permisos.apruebaCotizaciones || permisos.autorizaCotizaciones;
  }, [permisos]);

  // Determinar si puede enviar a cotización basado en permisos y estado
  const canSendToQuote = useMemo(() => {
    // Debe tener permiso de gestionar cotizaciones o superior
    const hasPermission = hasAnyCotizacionPermiso;

    // Debe haber items pendientes
    const hasAvailableItems = availableItems.length > 0;

    // La solicitud debe estar en estado apropiado
    const validStatus = solicitud.status === "PENDIENTE" || solicitud.status === "EN_COTIZACION";

    return hasPermission && hasAvailableItems && validStatus;
  }, [hasAnyCotizacionPermiso, availableItems.length, solicitud.status]);

  // Información adicional para mostrar en el botón (memorizado)
  const totalCotizaciones = useMemo(() => {
    return solicitud.cotizaciones?.length || 0;
  }, [solicitud.cotizaciones?.length]);

  const handleCotizacionSuccess = useCallback(() => {
    console.log("Cotizaciones creadas exitosamente");
    // Invalidar las queries de cotizaciones para refrescar los datos
    queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
    // También refrescar la página para asegurar que todos los datos estén actualizados
    router.refresh();
  }, [queryClient, router]);

  return (
    <>
      <div className="space-y-6">
        {/* Header con botón atrás y información básica */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-6">
              {/* Título de la solicitud */}
              <h1 className="text-2xl font-bold whitespace-nowrap">Solicitud {solicitud.folio}</h1>

              {/* Información mejorada del barco y solicitante - A la derecha del título */}
              <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 rounded-lg border border-blue-200 dark:border-slate-800 shadow-sm">
                {/* Barco */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                    <Ship className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider">Barco</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{solicitud.ship?.name || "Sin asignar"}</span>
                  </div>
                </div>

                {/* Separador */}
                <div className="h-6 w-px bg-blue-300 dark:bg-slate-700"></div>

                {/* Solicitante */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-full">
                    <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider">Solicitante</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{solicitud.solicitante?.name || "Sin asignar"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {canSendToQuote && (
            <div className="flex items-center gap-3">
              {totalCotizaciones > 0 && (
                <div className="text-sm text-muted-foreground">
                  {totalCotizaciones} cotización{totalCotizaciones > 1 ? "es" : ""} creada{totalCotizaciones > 1 ? "s" : ""}
                </div>
              )}
              <Button id="btn-cotizar" className="bg-custom-blue" onClick={() => setSendToQuoteOpen(true)}>
                <Send className="mr-2 h-4 w-4" />
                {totalCotizaciones > 0 ? "Crear Nueva Cotización" : "Enviar a Cotización"}
              </Button>
            </div>
          )}
        </div>

        {/* Alerta de solicitud rechazada */}
        {solicitud.status === "RECHAZADA" && (
          <RejectedSolicitudAlert solicitudId={solicitudId} solicitudFolio={solicitud.folio} canReopen={permisos.apruebaCotizaciones || permisos.autorizaCotizaciones} />
        )}

        {/* Tabs para organizar el contenido */}
        {hasAnyCotizacionPermiso ? (
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="detalle" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Detalle de Solicitud
              </TabsTrigger>

              <TabsTrigger value="cotizaciones" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Cotizaciones ({solicitud.cotizaciones?.length || 0})
              </TabsTrigger>
            </TabsList>

            {/* Tab de Detalle */}
            <TabsContent value="detalle" className="mt-6">
              <SolicitudReadOnlyForm solicitud={solicitud} permisos={permisos} />
            </TabsContent>

            {/* Tab de Cotizaciones */}
            <TabsContent value="cotizaciones" className="mt-6">
              <CotizacionesSection solicitudId={solicitudId} permisos={permisos} />
            </TabsContent>
          </Tabs>
        ) : (
          // Sin permisos: solo mostrar el detalle sin tabs
          <div className="mt-6">
            <SolicitudReadOnlyForm solicitud={solicitud} permisos={permisos} />
          </div>
        )}
      </div>

      {/* Dialog para enviar a cotización - solo si tiene permisos */}
      {canSendToQuote && (
        <SendToQuoteDialog
          open={sendToQuoteOpen}
          onOpenChange={setSendToQuoteOpen}
          solicitudId={solicitudId}
          items={solicitud.items || []}
          onSuccess={handleCotizacionSuccess}
          observacionCrearSolicitudCotizacion={solicitud.observacionCrearSolicitudCotizacion}
        />
      )}
    </>
  );
}
