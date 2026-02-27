/**
 * Página: Listado de Solicitudes de Insumos
 * Archivo: app/insumos/listado/page.tsx
 *
 * Vista principal con estadísticas, búsqueda y tabla de solicitudes
 */

"use client";

import { useState, useTransition } from "react";
import { useSupplyRequests } from "@/lib/hooks/supply/use-supply-requests";
import { useSupplyCatalogs } from "@/lib/hooks/supply/use-supply-catalogs";
import { useSupplyDashboardKPIs } from "@/lib/hooks/supply/use-supply-dashboard";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { columns } from "./columns";
import { RequestFilters } from "./components/RequestFilters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Download,
  ClipboardList,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  TestTube2,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crearSolicitudPrueba, limpiarDatosModulo } from "./actions";
import RequestItemsModal from "./components/RequestItemsModal";

// --------------- Tarjeta de estadística ---------------

interface StatCardProps {
  label: string;
  value: number | undefined;
  /** Clase Tailwind del color del número (ej: "text-amber-600") */
  valueClass: string;
  /** Clase Tailwind del fondo del ícono (ej: "bg-amber-100 dark:bg-amber-950") */
  iconBgClass: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}

function StatCard({ label, value, valueClass, iconBgClass, icon, isLoading }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm p-4 flex items-center gap-4">
      <div className={`rounded-lg p-2.5 ${iconBgClass}`}>
        <div className={valueClass}>{icon}</div>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        {isLoading ? (
          <Skeleton className="h-7 w-12 mt-1" />
        ) : (
          <p className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value ?? 0}</p>
        )}
      </div>
    </div>
  );
}

// --------------- Página principal ---------------

export default function ListadoSolicitudesPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Estado de búsqueda inline
  const [searchInput, setSearchInput] = useState("");
  // Estado de filtros avanzados
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Estado de diálogo de confirmación de limpieza
  const [showCleanDialog, setShowCleanDialog] = useState(false);
  // Estado de modal de items
  const [itemsModalOpen, setItemsModalOpen] = useState(false);
  const [selectedRequestForItems, setSelectedRequestForItems] = useState<string | null>(null);
  // Estado de filtros aplicados
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    status: "",
    installationId: "",
    priority: "",
    requester: "",
    startDate: "",
    endDate: "",
    search: "",
  });

  // Aplicar búsqueda al pulsar Enter o cambiar con debounce
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }
  };

  // Queries
  const { data, isLoading, isFetching, refetch } = useSupplyRequests(filters);
  const { data: kpis, isLoading: kpisLoading } = useSupplyDashboardKPIs();
  const { installations } = useSupplyCatalogs();
  const { data: modulePermissions } = useQuery<string[]>({
    queryKey: ["permissions", "me", "insumos"],
    queryFn: async () => {
      const response = await fetch("/api/v1/permissions/me/insumos", {
        credentials: "include",
      });
      if (!response.ok) return [];
      const json = await response.json();
      return Array.isArray(json?.data) ? json.data : [];
    },
    staleTime: 60_000,
  });

  const hasGestionaCotizaciones =
    modulePermissions?.includes("gestionar_cotizaciones") ||
    modulePermissions?.includes("gestiona_cotizaciones") ||
    false;

  const hasAutorizaCotizaciones =
    modulePermissions?.includes("autorizar_cotizaciones") ||
    modulePermissions?.includes("autorizar_compras") ||
    false;

  const hasApruebaCotizaciones =
    modulePermissions?.includes("aprobar_cotizaciones") ||
    modulePermissions?.includes("aprueba_cotizaciones") ||
    false;

  // Manejar cambio de filtro avanzado
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  // Limpiar todos los filtros
  const handleClearFilters = () => {
    setSearchInput("");
    setFilters({
      page: 1,
      pageSize: 20,
      status: "",
      installationId: "",
      priority: "",
      requester: "",
      startDate: "",
      endDate: "",
      search: "",
    });
  };

  // Paginación
  const totalPages = data?.pagination.totalPages ?? 1;

  const goToPage = (page: number) =>
    setFilters((prev) => ({ ...prev, page: Math.max(1, Math.min(page, totalPages)) }));

  // Función para abrir modal de items
  const openItemsModal = (requestId: string) => {
    setSelectedRequestForItems(requestId);
    setItemsModalOpen(true);
  };

  // Tabla
  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      openItemsModal,
    },
  });

  // Handlers de utilidades
  const handleCrearSolicitudPrueba = async () => {
    startTransition(async () => {
      const result = await crearSolicitudPrueba();
      if (result.success) {
        toast.success(`Solicitud de prueba creada: ${result.data?.folio}`);
        router.push(`/insumos/${result.data?.id}`);
      } else {
        toast.error(result.error || "Error al crear solicitud de prueba");
      }
    });
  };

  const handleLimpiarDatos = async () => {
    startTransition(async () => {
      const result = await limpiarDatosModulo();
      if (result.success) {
        toast.success("Datos del módulo limpiados exitosamente");
        setShowCleanDialog(false);
        refetch();
      } else {
        toast.error(result.error || "Error al limpiar los datos");
      }
    });
  };

  return (
    <div className="w-full space-y-4 pb-6">
      {/* ─── Header ─── */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Insumos</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${hasGestionaCotizaciones ? "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800" : "border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"}`}>
                Gestiona: {hasGestionaCotizaciones ? "Sí" : "No"}
              </span>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${hasAutorizaCotizaciones ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"}`}>
                Autoriza: {hasAutorizaCotizaciones ? "Sí" : "No"}
              </span>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${hasApruebaCotizaciones ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"}`}>
                Aprueba: {hasApruebaCotizaciones ? "Sí" : "No"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Botones de utilidades */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCrearSolicitudPrueba}
              disabled={isPending}
              className="gap-2 hidden lg:flex"
              title="Crear solicitud de prueba con 5 productos"
            >
              <TestTube2 className="h-4 w-4" />
              Usar Datos de Prueba
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCleanDialog(true)}
              disabled={isPending}
              className="gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hidden lg:flex"
              title="Eliminar todos los datos transaccionales del módulo"
            >
              <Trash2 className="h-4 w-4" />
              Limpiar Datos
            </Button>

            <Button asChild className="bg-[#283c7f] hover:bg-[#1e2f63]">
              <Link href="/insumos/ingreso">
                <Plus className="h-4 w-4 mr-2 text-white" />
                <span className="text-white">Nueva Solicitud</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Tarjetas de estadísticas ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total Solicitudes"
          value={kpis?.totalRequests}
          valueClass="text-slate-700 dark:text-slate-300"
          iconBgClass="bg-slate-100 dark:bg-slate-800"
          icon={<ClipboardList className="h-5 w-5" />}
          isLoading={kpisLoading}
        />
        <StatCard
          label="Pendientes"
          value={kpis?.pendingRequests}
          valueClass="text-amber-600 dark:text-amber-400"
          iconBgClass="bg-amber-50 dark:bg-amber-950"
          icon={<Clock className="h-5 w-5" />}
          isLoading={kpisLoading}
        />
        <StatCard
          label="En Cotización"
          value={kpis?.inProcessRequests}
          valueClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-50 dark:bg-blue-950"
          icon={<FileText className="h-5 w-5" />}
          isLoading={kpisLoading}
        />
        <StatCard
          label="Aprobadas"
          value={kpis?.approvedRequests}
          valueClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-50 dark:bg-emerald-950"
          icon={<CheckCircle2 className="h-5 w-5" />}
          isLoading={kpisLoading}
        />
        <StatCard
          label="Rechazadas"
          value={kpis?.rejectedRequests}
          valueClass="text-red-600 dark:text-red-400"
          iconBgClass="bg-red-50 dark:bg-red-950"
          icon={<XCircle className="h-5 w-5" />}
          isLoading={kpisLoading}
        />
      </div>

      {/* ─── Panel de tabla ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
          {/* Búsqueda inline + botón Filtros */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio, descripción o solicitante..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-9 h-9 text-sm"
                autoComplete="off"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`gap-1.5 h-9 ${filtersOpen ? "bg-accent" : ""}`}
            >
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>

          {/* Acciones del lado derecho */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              title="Exportar CSV"
              disabled={isLoading}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              title="Refrescar"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Filtros avanzados (colapsables) */}
        {filtersOpen && (
          <div className="border-b border-border">
            <RequestFilters
              installations={installations}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />
          </div>
        )}

        {/* Tabla */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="hover:bg-transparent">
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-slate-50 dark:bg-slate-800/50 h-9"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Skeleton de carga
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, j) => (
                      <TableCell key={j} className="py-3">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    No se encontraron solicitudes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ─── Paginación ─── */}
        {(data?.pagination.total ?? 0) > 0 && (
          <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
            {/* Izquierda: total + selector de filas */}
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <span>
                Total: <span className="font-medium">{data!.pagination.total}</span> solicitudes
              </span>
              <Select
                value={String(filters.pageSize)}
                onValueChange={(v) => setFilters((prev) => ({ ...prev, pageSize: Number(v), page: 1 }))}
              >
                <SelectTrigger className="h-7 w-17.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 30, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-xs">
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Centro: página actual */}
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Página {data!.pagination.page} de {totalPages}
            </span>

            {/* Derecha: botones de navegación */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 hidden lg:flex"
                onClick={() => goToPage(1)}
                disabled={filters.page === 1 || isFetching}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => goToPage(filters.page - 1)}
                disabled={filters.page === 1 || isFetching}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => goToPage(filters.page + 1)}
                disabled={filters.page >= totalPages || isFetching}
              >
                Siguiente
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 hidden lg:flex"
                onClick={() => goToPage(totalPages)}
                disabled={filters.page >= totalPages || isFetching}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog de confirmación de limpieza */}
      <AlertDialog open={showCleanDialog} onOpenChange={setShowCleanDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Limpiar todos los datos del módulo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará <strong>TODAS las solicitudes, cotizaciones e items</strong> del módulo de insumos.
              <br /><br />
              Los datos maestros (estados, categorías, proveedores, instalaciones) se mantendrán intactos.
              <br /><br />
              <strong className="text-red-600 dark:text-red-400">Esta acción no se puede deshacer.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLimpiarDatos}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? "Limpiando..." : "Sí, limpiar todo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de items */}
      <RequestItemsModal
        requestId={selectedRequestForItems}
        open={itemsModalOpen}
        onOpenChange={setItemsModalOpen}
      />
    </div>
  );
}