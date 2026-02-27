"use client";

import { useState } from "react";
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  FileText,
  Send,
  ShoppingCart,
  XCircle,
  Info,
  Calendar,
  Building2,
  User,
  CheckCircle,
  AlertTriangle,
  FileTextIcon,
  MessageSquare,
} from "lucide-react";
import { statusSolicitud } from "../../../../../../utils/formatos";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteSolicitudInsumos } from "@/actions/solicitud-insumos/solicitudActions";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import RejectSolicitudDialog from "./RejectSolicitudDialog";
import ItemCountBadge from "./ItemCountBadgeModal";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import ItemStatusSummary from "./ItemStatusSummary";
import { SolicitudItemStatus } from "@prisma/client";

// Variable de entorno para mostrar/ocultar Área, Prioridad y Fecha Estimada de Entrega
const SHOW_AREA_PRIORITY_DATE = process.env.NEXT_PUBLIC_SHOW_AREA_PRIORITY_DATE === "true";

type SolicitudInsumos = {
  id: number;
  folio: string | null;
  status: string;
  prioridad: string;
  descripcion: string;
  descripcionInterna?: string | null;
  observacionCrearSolicitudCotizacion?: string | null;
  fechaSolicitud: string;
  fechaEstimadaEntrega: string | null;
  ship: { id: number; name: string };
  solicitante: { id: number; name: string };
  area: { id: number; name: string } | null;
  requestedBy: { id: number; username: string; email: string };
  items?: Array<{ id: number; status: SolicitudItemStatus; name?: string; quantity?: number }>; // Incluye name y quantity
  _count: {
    items: number;
    cotizaciones: number;
  };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

interface SolicitudesTableProps {
  solicitudes: SolicitudInsumos[];
  pagination: Pagination | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  itemStates: Record<number, SolicitudItemStatus>;
  updateItemStatus: (itemId: number, status: SolicitudItemStatus) => void;
  calculateSolicitudStatus: (items: any[]) => string;
  permisos?: {
    gestionaCotizaciones: boolean;
    apruebaCotizaciones: boolean;
    autorizaCotizaciones: boolean;
  };
  selectShips?: {
    isAllowed: boolean;
    shipId?: number | null;
    userOnShip?: any[];
    shipSelect?: { id: number; name: string }[];
  };
}

const getStatusBadge = (status: string) => {
  const statusConfig = {
    PENDIENTE: { label: "Pendiente", variant: "secondary" as const },
    EN_COTIZACION: { label: "En Cotización", variant: "default" as const },
    APROBADA: { label: "Aprobada", variant: "default" as const },
    RECHAZADA: { label: "Rechazada", variant: "destructive" as const },
    CERRADA: { label: "Cerrada", variant: "secondary" as const },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    variant: "secondary" as const,
  };

  return (
    <Badge
      variant={config.variant}
      className={
        status === "APROBADA"
          ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
          : status === "EN_COTIZACION"
            ? "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
            : ""
      }
    >
      {config.label}
    </Badge>
  );
};

const getPrioridadBadge = (prioridad: string) => {
  const prioridadConfig = {
    BAJA: { label: "Baja", variant: "secondary" as const },
    NORMAL: { label: "Normal", variant: "outline" as const },
    ALTA: { label: "Alta", variant: "default" as const },
    URGENTE: { label: "Urgente", variant: "destructive" as const },
  };

  const config = prioridadConfig[prioridad as keyof typeof prioridadConfig] || {
    label: prioridad,
    variant: "outline" as const,
  };

  return (
    <Badge variant={config.variant} className={prioridad === "ALTA" ? "bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800" : ""}>
      {config.label}
    </Badge>
  );
};

export default function SolicitudesTable({
  solicitudes,
  pagination,
  isLoading,
  onPageChange,
  onRefresh,
  itemStates,
  updateItemStatus,
  calculateSolicitudStatus,
  permisos,
  selectShips,
}: SolicitudesTableProps) {
  // Por defecto, usuarios básicos solo pueden eliminar sus propias solicitudes sin cotizaciones
  // Administradores y usuarios con permisos pueden hacer más
  const canDeleteAnySolicitud = selectShips?.isAllowed || false;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSolicitudInsumos(id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message);
        onRefresh();
      } else {
        toast.error(res.message || "Error al eliminar");
      }
    },
    onError: (err) => {
      console.error(err);
      toast.error("Error al eliminar la solicitud");
    },
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: number; label: string } | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: number; folio: string } | null>(null);

  // Determinar si el usuario tiene algún permiso de cotizaciones
  const hasAnyCotizacionPermiso = permisos?.gestionaCotizaciones || permisos?.apruebaCotizaciones || permisos?.autorizaCotizaciones || false;

  // Columna de Prioridad - se incluye condicionalmente
  const prioridadColumn: ColumnDef<SolicitudInsumos> = {
    accessorKey: "prioridad",
    header: "Prioridad",
    cell: ({ row }) => getPrioridadBadge(row.original.prioridad),
  };

  const columns: ColumnDef<SolicitudInsumos>[] = [
    {
      accessorKey: "folio",
      header: () => <div className="pl-2">Folio</div>,
      cell: ({ row }) => {
        const solicitud = row.original;
        const hasItems = (solicitud._count?.items ?? 0) > 0;
        const cotCount = solicitud._count?.cotizaciones ?? 0;
        const canSendToQuote = hasItems && (solicitud.status === "PENDIENTE" || solicitud.status === "EN_COTIZACION");
        const hasDescripcionInterna = solicitud.descripcionInterna && solicitud.descripcionInterna.trim() !== "";
        const hasObservacionCotizacion = solicitud.observacionCrearSolicitudCotizacion && solicitud.observacionCrearSolicitudCotizacion.trim() !== "";
        const iconColor = hasObservacionCotizacion ? "red" : "green";

        return (
          <div className="flex items-center whitespace-nowrap">
            {hasAnyCotizacionPermiso ? (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button aria-label={`Información ${solicitud.folio || `#${solicitud.id}`}`} className="ml-1 mr-1 text-muted-foreground hover:text-foreground">
                      <Info className="h-4 w-4" color={iconColor} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-md p-0 overflow-hidden border-none shadow-xl">
                    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-t-4 border-blue-500">
                      {/* Header */}
                      <div className="px-3 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-base text-slate-900 dark:text-slate-100">{solicitud.folio || `#${solicitud.id}`}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(solicitud.fechaSolicitud), "dd 'de' MMMM, yyyy", { locale: es })}
                            </div>
                          </div>
                          <div className="ml-3">{getStatusBadge(solicitud.status)}</div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="px-1 py-1 space-y-1">
                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-1">
                          <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-1 border border-slate-200/50 dark:border-slate-600/30">
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              Instalación
                            </div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{solicitud.ship.name}</div>
                          </div>
                          <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-2 border border-slate-200/50 dark:border-slate-600/30">
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Solicitante
                            </div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{solicitud.solicitante.name}</div>
                          </div>
                        </div>

                        {/* Status Actions */}
                        {canSendToQuote && (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg p-1.5 flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                            <span className="text-xs font-medium text-green-700 dark:text-green-300">Disponible para enviar a cotización</span>
                          </div>
                        )}
                        {!hasItems && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-1.5 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Sin ítems para cotización</span>
                          </div>
                        )}

                        {/* Descripción Solicitante */}
                        {solicitud.descripcion && (
                          <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-1 border border-slate-200/50 dark:border-slate-600/30">
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                              <FileTextIcon className="w-3 h-3" />
                              Descripción del Solicitante
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              {solicitud.descripcion.length > 200 ? solicitud.descripcion.slice(0, 200) + "…" : solicitud.descripcion}
                            </div>
                          </div>
                        )}

                        {/* Descripción Interna */}
                        {hasDescripcionInterna && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-1 border border-blue-200 dark:border-blue-800/50">
                            <div className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              Nota Interna
                            </div>
                            <div className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed font-medium">
                              {solicitud.descripcionInterna && solicitud.descripcionInterna.length > 200 ? solicitud.descripcionInterna.slice(0, 200) + "…" : solicitud.descripcionInterna}
                            </div>
                          </div>
                        )}

                        {/* Observación de Cotización (Destacada en Rojo) */}
                        {hasObservacionCotizacion && (
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-1 border-2 border-red-400 dark:border-red-600 shadow-sm">
                            <div className="text-xs font-bold text-red-900 dark:text-red-300 mb-1 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                              Observación de Cotización
                            </div>
                            <div className="text-xs text-red-800 dark:text-red-200 leading-relaxed font-semibold">
                              {solicitud.observacionCrearSolicitudCotizacion && solicitud.observacionCrearSolicitudCotizacion.length > 200
                                ? solicitud.observacionCrearSolicitudCotizacion.slice(0, 200) + "…"
                                : solicitud.observacionCrearSolicitudCotizacion}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="ml-2"></div>
            )}
            <Link
              href={`/dashboard/mantencion/solicitud-insumos/${solicitud.id}${cotCount > 0 ? "?tab=cotizaciones" : ""}`}
              className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              {solicitud.folio || `#${solicitud.id}`}
            </Link>
          </div>
        );
      },
    },
    // Columna Estado - solo visible si tiene permisos de cotizaciones
    ...(hasAnyCotizacionPermiso
      ? [
          {
            accessorKey: "status",
            header: "Estado",
            cell: ({ row }: { row: any }) => getStatusBadge(row.original.status),
          } as ColumnDef<SolicitudInsumos>,
        ]
      : []),
    ...(SHOW_AREA_PRIORITY_DATE ? [prioridadColumn] : []),
    {
      accessorKey: "descripcion",
      header: "Des. Solicitante",
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate text-sm text-gray-600 dark:text-slate-400" title={row.original.descripcion}>
          {row.original.descripcion}
        </div>
      ),
    },
    {
      accessorKey: "ship.name",
      header: "Instalación",
      cell: ({ row }) => <div className="text-sm font-medium text-gray-900 dark:text-slate-200">{row.original.ship.name}</div>,
    },
    {
      accessorKey: "solicitante.name",
      header: "Solicitante",
      cell: ({ row }) => <div className="text-sm text-gray-700 dark:text-slate-300">{row.original.solicitante.name}</div>,
    },
    {
      accessorKey: "fechaSolicitud",
      header: "Fecha",
      cell: ({ row }) => <div className="text-sm text-gray-600 dark:text-slate-400">{format(new Date(row.original.fechaSolicitud), "dd/MM/yyyy", { locale: es })}</div>,
    },
    {
      accessorKey: "_count",
      header: "Items",
      cell: ({ row }) => (
        <div className="text-center">
          <ItemCountBadge items={row.original.items || []} cotizacionesCount={row.original._count.cotizaciones} solicitudId={row.original.id} hasPermiso={hasAnyCotizacionPermiso} />
        </div>
      ),
    },
    // Columna Estados Items - solo visible si tiene permisos de cotizaciones
    ...(hasAnyCotizacionPermiso
      ? [
          {
            id: "itemStatus",
            header: "Estados Items",
            cell: ({ row }: { row: any }) => {
              const solicitud = row.original;
              const items = solicitud.items || [];
              return <ItemStatusSummary items={items} itemStates={itemStates} updateItemStatus={updateItemStatus} />;
            },
          } as ColumnDef<SolicitudInsumos>,
        ]
      : []),
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/mantencion/solicitud-insumos/${row.original.id}`} className="cursor-pointer">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalle
                </Link>
              </DropdownMenuItem>

              {row.original.status === "PENDIENTE" && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/mantencion/solicitud-insumos/${row.original.id}/edit`} className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* Solo mostrar eliminar si es admin o si la solicitud no tiene cotizaciones */}
                  {(canDeleteAnySolicitud || row.original._count.cotizaciones === 0) && (
                    <DropdownMenuItem
                      onClick={() => {
                        setToDelete({ id: row.original.id, label: `${row.original.folio || `#${row.original.id}`}` });
                        setConfirmOpen(true);
                      }}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </>
              )}

              {/* Opción de rechazar solicitud - disponible para PENDIENTE y EN_COTIZACION - solo con permisos */}
              {hasAnyCotizacionPermiso && ["PENDIENTE", "EN_COTIZACION"].includes(row.original.status) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setRejectDialog({
                        id: row.original.id,
                        folio: row.original.folio || `#${row.original.id}`,
                      });
                    }}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rechazar Solicitud
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ),
    },
  ];

  const table = useReactTable({
    data: solicitudes,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <TooltipProvider>
        <div className="space-y-4">
          {/* Loading skeleton */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 animate-pulse rounded" />
          ))}
        </div>
      </TooltipProvider>
    );
  }

  if (solicitudes.length === 0) {
    return (
      <TooltipProvider>
        <div className="text-center py-16 bg-card text-card-foreground rounded-lg border border-border">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No hay solicitudes</h3>
          <p className="mt-2 text-sm text-muted-foreground">Comienza creando una nueva solicitud de insumos.</p>
          <Button className="mt-6 bg-custom-blue hover:bg-blue-700 text-white" onClick={() => (window.location.href = "/dashboard/mantencion/solicitud-insumos/crear")}>
            <FileText className="mr-2 h-4 w-4" />
            Nueva Solicitud
          </Button>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Table */}
        <div className="rounded-md border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-slate-900 dark:to-slate-800/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-gray-200">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="font-semibold text-foreground py-3 text-xs uppercase tracking-wider">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors duration-150 border-b border-border last:border-0"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No se encontraron resultados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-1 py-1.5">
            <div className="text-sm text-muted-foreground font-medium">
              Mostrando <span className="font-semibold text-foreground">{(pagination.page - 1) * pagination.limit + 1}</span> a{" "}
              <span className="font-semibold text-foreground">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> de{" "}
              <span className="font-semibold text-foreground">{pagination.total}</span> resultados
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page === 1} className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNumber = pagination.page - 2 + i;
                  if (pageNumber < 1 || pageNumber > pagination.totalPages) return null;

                  return (
                    <Button
                      key={pageNumber}
                      variant={pageNumber === pagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(pageNumber)}
                      className={pageNumber === pagination.page ? "bg-custom-blue" : ""}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button variant="outline" size="sm" onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} className="gap-1">
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Confirm delete dialog */}
        <Dialog
          open={confirmOpen}
          onOpenChange={(open) => {
            if (!open) setToDelete(null);
            setConfirmOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Confirmar eliminación</DialogTitle>
              <DialogDescription className="text-muted-foreground pt-2">
                ¿Está seguro de que desea eliminar la solicitud <span className="font-semibold text-foreground">{toDelete?.label}</span>?
                <br />
                <span className="text-red-500 font-semibold">Esta acción no se puede deshacer.</span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (toDelete) deleteMutation.mutate(toDelete.id);
                  setConfirmOpen(false);
                  setToDelete(null);
                }}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject solicitud dialog */}
        {rejectDialog && <RejectSolicitudDialog solicitudId={rejectDialog.id} solicitudFolio={rejectDialog.folio} open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)} />}
      </div>
    </TooltipProvider>
  );
}
