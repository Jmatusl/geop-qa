import React from "react";
import SolicitudFormHeader from "./SolicitudFormHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  solicitud: any;
  permisos?: {
    gestionaCotizaciones: boolean;
    apruebaCotizaciones: boolean;
    autorizaCotizaciones: boolean;
  };
}

const SHOW_AREA_PRIORITY_DATE = process.env.NEXT_PUBLIC_SHOW_AREA_PRIORITY_DATE === "true";

const InputLike = ({ children }: { children: React.ReactNode }) => (
  <div className="border rounded px-3 py-2 bg-white dark:bg-slate-950 dark:border-slate-800 text-sm min-h-[40px] flex items-center transition-colors">{children}</div>
);

const prioridadOptions = {
  BAJA: "Baja",
  NORMAL: "Normal",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    PENDIENTE: { label: "Pendiente", variant: "secondary" as const, className: "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200" },
    EN_COTIZACION: { label: "En Cotización", variant: "default" as const, className: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300" },
    COTIZADO: { label: "Cotizado", variant: "default" as const, className: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300" },
    APROBADO: { label: "Aprobado", variant: "default" as const, className: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" },
    RECHAZADO: { label: "Rechazado", variant: "destructive" as const, className: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300" },
    EN_ORDEN_COMPRA: { label: "En Orden de Compra", variant: "default" as const, className: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300" },
    COMPLETADO: { label: "Completado", variant: "default" as const, className: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300" },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    variant: "secondary" as const,
    className: "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200",
  };

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
};

export default function SolicitudReadOnlyForm({ solicitud, permisos }: Props) {
  // Se espera que solicitud tenga los datos y arrays ships, areas, solicitantes
  const { ships = [], areas = [], solicitantes = [] } = solicitud;
  const items = solicitud.items ?? [];

  // Verificar si el usuario tiene algún permiso de cotizaciones
  const hasPermiso = permisos?.gestionaCotizaciones || permisos?.apruebaCotizaciones || permisos?.autorizaCotizaciones || false;

  return (
    <div className="space-y-6">
      {/* <pre>{JSON.stringify(solicitud, null, 2)}</pre> */}
      {/* Cabecera en Card, con SolicitudFormHeader en modo lectura */}
      <Card className="dark:bg-slate-900 dark:border-slate-800 overflow-hidden shadow-md">
        <CardHeader className="bg-gray-50/50 dark:bg-slate-900 p-6 border-b dark:border-slate-800">
          <SolicitudFormHeader
            mode="view"
            subtitle="Visualización de solicitud en modo solo lectura."
            isSubmitting={false}
            itemsCount={items.length}
            fechaEstimadaEntrega={solicitud.fechaEstimadaEntrega}
            areaName={items.area?.name}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-slate-200 mb-1.5 uppercase tracking-tight text-[11px]">Instalación</label>
              <InputLike>{solicitud.ship?.name}</InputLike>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-slate-200 mb-1.5 uppercase tracking-tight text-[11px]">Solicitante</label>
              <InputLike>{solicitud.solicitante?.name}</InputLike>
            </div>
          </div>
          {SHOW_AREA_PRIORITY_DATE && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-slate-200 mb-1.5 uppercase tracking-tight text-[11px]">Área</label>
                <InputLike>{solicitud.area?.name}</InputLike>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-slate-200 mb-1.5 uppercase tracking-tight text-[11px]">Prioridad</label>
                <InputLike>{prioridadOptions[solicitud.prioridad as keyof typeof prioridadOptions] ?? solicitud.prioridad}</InputLike>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-slate-200 mb-1.5 uppercase tracking-tight text-[11px]">Fecha Estimada de Entrega</label>
                <InputLike>{solicitud.fechaEstimadaEntrega ? format(new Date(solicitud.fechaEstimadaEntrega), "dd/MM/yyyy", { locale: es }) : ""}</InputLike>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-slate-200 mb-1.5 uppercase tracking-tight text-[11px]">Descripción</label>
            <InputLike>{solicitud.descripcion}</InputLike>
          </div>
          {solicitud.descripcionInterna && hasPermiso && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-slate-200 mb-1.5 uppercase tracking-tight text-[11px]">Descripción Interna</label>
              <InputLike>{solicitud.descripcionInterna}</InputLike>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de items solicitados mejorada visualmente */}
      <Card className="border-gray-200 dark:border-slate-800 shadow-lg overflow-hidden dark:bg-slate-900">
        <CardHeader className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 p-5">
          <CardTitle className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">Items Solicitados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto mx-4">
            <Table>
              <TableHeader className="bg-gray-50/30 dark:bg-slate-800/30">
                <TableRow className="border-b border-gray-200 dark:border-slate-800">
                  <TableHead className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-200 uppercase tracking-tight text-[11px]">Nombre</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-200 uppercase tracking-tight text-[11px]">Categoría</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-200 uppercase tracking-tight text-[11px]">Cantidad</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-200 uppercase tracking-tight text-[11px]">Unidad</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-200 uppercase tracking-tight text-[11px]">Urgencia</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-200 uppercase tracking-tight text-[11px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-600 px-4 py-6">
                      No hay items
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item: any, idx: number) => (
                    <TableRow key={item.id ?? idx} className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors border-b border-gray-100 dark:border-slate-800 last:border-0">
                      <TableCell className="px-4 py-3.5 font-medium text-gray-900 dark:text-slate-100">{item.name}</TableCell>
                      <TableCell className="px-4 py-3.5 text-gray-600 dark:text-slate-300">{item.categoriaInsumos?.nombre || item.categoriaInsumosNombre || "-"}</TableCell>
                      <TableCell className="px-4 py-3.5 text-gray-700 dark:text-slate-200 font-semibold">{item.quantity}</TableCell>
                      <TableCell className="px-4 py-3.5 text-gray-600 dark:text-slate-300">{item.unit}</TableCell>
                      <TableCell className="px-4 py-3.5 text-gray-600 dark:text-slate-300">{prioridadOptions[item.urgency as keyof typeof prioridadOptions] ?? item.urgency}</TableCell>
                      <TableCell className="px-4 py-3.5">{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-6 py-3 bg-gray-50/30 dark:bg-slate-900/50 border-t border-gray-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">💡 Los items se muestran en modo solo lectura.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
