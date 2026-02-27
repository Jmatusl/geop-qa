"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSolicitudesInsumos } from "@/actions/solicitud-insumos/solicitudActions";
import { getDeleteData, deleteAllSolicitudes, type DeleteData } from "@/actions/solicitud-insumos/deleteAllActions";
import { createSolicitudInsumos, getFormData } from "@/actions/solicitud-insumos/solicitudActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Filter, Trash2, FilePlus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import SolicitudFilters from "./SolicitudFilters";
import SolicitudesTable from "./SolicitudesTable";
import { SolicitudesFilter } from "@/validations/solicitud-insumos/schemas";
import { calculateSolicitudStatus } from "@/utils/solicitudStatusCalculator";
import { SolicitudItemStatus } from "@prisma/client";

interface Props {
  permisos: {
    gestionaCotizaciones: boolean;
    apruebaCotizaciones: boolean;
    autorizaCotizaciones: boolean;
  };
  selectShips: {
    isAllowed: boolean;
    shipId?: number | null;
    userOnShip?: any[];
    shipSelect?: { id: number; name: string }[];
  };
}

export default function SolicitudesTableClient({ permisos, selectShips }: Props) {
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteData, setDeleteData] = useState<DeleteData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Determinar si el usuario tiene acceso restringido (no es admin)
  const isSelectRestricted = selectShips?.isAllowed === false;

  // Construir shipIds permitidos para usuarios no admin
  const allowedShipIds = isSelectRestricted
    ? selectShips.userOnShip && selectShips.userOnShip.length > 0
      ? selectShips.userOnShip.map((ship: any) => ship.shipId)
      : selectShips.shipId
        ? [selectShips.shipId]
        : []
    : undefined;

  // Incluir shipIds en los filtros iniciales si el usuario está restringido
  const initialFilters: Partial<SolicitudesFilter> = {
    page: 1,
    limit: 10,
    ...(isSelectRestricted && allowedShipIds && allowedShipIds.length > 0 ? { shipIds: allowedShipIds } : {}),
  };

  const [filters, setFilters] = useState<Partial<SolicitudesFilter>>(initialFilters);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para manejo individual de items
  const [itemStates, setItemStates] = useState<Record<number, SolicitudItemStatus>>({});

  // Función para actualizar estado de item individual
  const updateItemStatus = (itemId: number, newStatus: SolicitudItemStatus) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: newStatus,
    }));
  };

  // Query para obtener solicitudes - el filtrado por shipIds se hace en el servidor
  const {
    data: solicitudesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["solicitudes-insumos", filters],
    queryFn: () => getSolicitudesInsumos(filters),
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters((prev) => ({
      ...prev,
      search: value || undefined,
      page: 1,
    }));
  };

  const handleFiltersApply = (newFilters: Partial<SolicitudesFilter>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1,
      // Mantener shipIds si el usuario está restringido
      ...(isSelectRestricted && allowedShipIds && allowedShipIds.length > 0 ? { shipIds: allowedShipIds } : {}),
    }));
    setShowFilters(false);
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleDeleteAll = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteAllSolicitudes();
      if (result.success) {
        setShowDeleteDialog(false);
        setDeleteData(null);
        refetch();
        toast.success(result.message || "Eliminación completada");
      } else {
        toast.error(result.message || "No se pudo eliminar");
      }
    } catch (error) {
      alert("Error al eliminar las solicitudes");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShowDeleteDialog = async () => {
    try {
      const data = await getDeleteData();
      setDeleteData(data);
      setShowDeleteDialog(true);
    } catch (error) {
      toast.error("Error al obtener los datos para eliminación");
    }
  };

  const handleCreateTestSolicitud = async () => {
    try {
      const formData = await getFormData();
      if (!formData?.success) {
        toast.error("No se pudo obtener datos de referencia para crear la solicitud de prueba");
        return;
      }

      const ships = formData.data?.ships || [];
      const solicitantes = formData.data?.solicitantes || [];

      if (ships.length === 0 || solicitantes.length === 0) {
        toast.error("No hay 'ship' o 'solicitante' disponible en la base de datos. Cree al menos uno antes de usar este botón.");
        return;
      }

      const shipId = ships[0].id;
      const solicitanteId = solicitantes[3].id;
      const areas = formData.data?.areas || [];
      const areaId = areas.length > 0 ? areas[0].id : undefined;

      const items = Array.from({ length: 10 }).map((_, i) => ({
        name: `Item de prueba ${i + 1}`,
        category: "consumible",
        quantity: Math.floor(Math.random() * 41) + 10,
        unit: "UN",
        technicalSpec: `Especificación de prueba ${i + 1}`,
      }));

      const fechaEstimadaEntrega = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const payload = {
        shipId,
        solicitanteId,
        ...(areaId ? { areaId } : {}),
        fechaEstimadaEntrega,
        prioridad: "NORMAL",
        descripcion: "Solicitud de prueba",
        observaciones: "Solicitud de prueba con 10 ítems",
        items,
      } as any;

      const result = await createSolicitudInsumos(payload);

      if (result.success) {
        toast.success("Solicitud de prueba creada: " + (result.data?.folio || result.data?.id || "(sin folio)"));
        refetch();
      } else {
        toast.error("No se pudo crear la solicitud de prueba: " + (result.message || ""));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error creando solicitud de prueba: " + (err?.message || err));
    }
  };

  const solicitudes = solicitudesData?.success && solicitudesData.data ? solicitudesData.data.solicitudes : [];
  const pagination = solicitudesData?.success && solicitudesData.data ? solicitudesData.data.pagination : null;

  // Estadísticas rápidas
  const stats = {
    total: pagination?.total || 0,
    pendientes: solicitudes.filter((s) => s.status === "PENDIENTE").length,
    enCotizacion: solicitudes.filter((s) => s.status === "EN_COTIZACION").length,
    aprobadas: solicitudes.filter((s) => s.status === "APROBADA").length,
    rechazadas: solicitudes.filter((s) => s.status === "RECHAZADA").length,
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xs">
          <span className={`px-2 py-1 rounded shadow-sm font-medium ${permisos.gestionaCotizaciones ? "bg-yellow-500 text-white" : "bg-gray-400 text-gray-100 dark:bg-gray-800 dark:text-gray-400"}`}>
            Gestiona: {permisos.gestionaCotizaciones ? "Sí" : "No"}
          </span>
        </div>

        <div className="text-xs">
          <span className={`px-2 py-1 rounded shadow-sm font-medium ${permisos.autorizaCotizaciones ? "bg-green-600 text-white" : "bg-gray-400 text-gray-100 dark:bg-gray-800 dark:text-gray-400"}`}>
            Autoriza: {permisos.autorizaCotizaciones ? "Sí" : "No"}
          </span>
        </div>
        <div className="text-xs">
          <span className={`px-2 py-1 rounded shadow-sm font-medium ${permisos.apruebaCotizaciones ? "bg-blue-600 text-white" : "bg-gray-400 text-gray-100 dark:bg-gray-800 dark:text-gray-400"}`}>
            Aprueba: {permisos.apruebaCotizaciones ? "Sí" : "No"}
          </span>
        </div>
      </div>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Solicitudes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{stats.pendientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Cotización</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.enCotizacion}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">{stats.aprobadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-500">{stats.rechazadas}</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons - Solo para administradores */}
      {selectShips.isAllowed && (
        <div className="flex justify-end items-center space-x-2">
          <Button variant="ghost" onClick={handleCreateTestSolicitud} title="Crear solicitud de prueba">
            <FilePlus className="h-5 w-5" />
          </Button>

          <Button variant="destructive" onClick={handleShowDeleteDialog} className="bg-red-600 hover:bg-red-700" title="Eliminar todo">
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por folio, descripción o solicitante..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} className="pl-8" />
              </div>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="mr-2 h-4 w-4" />
                Filtros
                {(() => {
                  // Contar únicamente filtros activos (no undefined) y excluir paginación
                  const activeCount = Object.entries(filters || {}).filter(([k, v]) => v !== undefined && k !== "page" && k !== "limit").length;
                  return activeCount > 0 ? (
                    <Badge variant="secondary" className="ml-2">
                      {activeCount}
                    </Badge>
                  ) : null;
                })()}
              </Button>
            </div>
          </div>

          {showFilters && (
            <SolicitudFilters
              filters={filters}
              onApply={handleFiltersApply}
              onReset={() => {
                setFilters({
                  page: 1,
                  limit: 10,
                  // Mantener shipIds si el usuario está restringido
                  ...(isSelectRestricted && allowedShipIds && allowedShipIds.length > 0 ? { shipIds: allowedShipIds } : {}),
                });
                setSearchTerm("");
              }}
              selectShips={selectShips}
            />
          )}
        </CardHeader>

        <CardContent className="p-2 m-0">
          {error && (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">Error al cargar las solicitudes: {error.message}</p>
              <Button onClick={() => refetch()}>Reintentar</Button>
            </div>
          )}

          {!error && (
            <SolicitudesTable
              solicitudes={solicitudes}
              pagination={pagination}
              isLoading={isLoading}
              onPageChange={handlePageChange}
              onRefresh={refetch}
              itemStates={itemStates}
              updateItemStatus={updateItemStatus}
              calculateSolicitudStatus={calculateSolicitudStatus}
              permisos={permisos}
              selectShips={selectShips}
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-red-600">⚠️ Confirmar Eliminación Total</DialogTitle>
            <DialogDescription>Esta acción eliminará permanentemente TODOS los registros relacionados con solicitudes de insumos. Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {deleteData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 p-3 rounded border">
                    <h4 className="font-semibold text-red-800">📋 SolicitudInsumos</h4>
                    <p className="text-sm text-red-600">{deleteData.solicitudes.length} registros</p>
                    {deleteData.solicitudes.slice(0, 3).map((s, i) => (
                      <p key={i} className="text-xs text-gray-600 mt-1">
                        • {s.folio} - {s.ship?.name}
                      </p>
                    ))}
                  </div>

                  <div className="bg-orange-50 p-3 rounded border">
                    <h4 className="font-semibold text-orange-800">📦 SolicitudInsumosItem</h4>
                    <p className="text-sm text-orange-600">{deleteData.solicitudItems.length} registros</p>
                    {deleteData.solicitudItems.slice(0, 3).map((s, i) => (
                      <p key={i} className="text-xs text-gray-600 mt-1">
                        • {s.name} ({s.quantity} {s.unit})
                      </p>
                    ))}
                  </div>

                  <div className="bg-blue-50 p-3 rounded border">
                    <h4 className="font-semibold text-blue-800">📎 Adjuntos</h4>
                    <p className="text-sm text-blue-600">
                      Items: {deleteData.itemAdjuntos.length} | Solicitudes: {deleteData.solicitudAdjuntos.length}
                    </p>
                  </div>

                  <div className="bg-purple-50 p-3 rounded border">
                    <h4 className="font-semibold text-purple-800">📝 Logs</h4>
                    <p className="text-sm text-purple-600">{deleteData.solicitudLogs.length} registros</p>
                  </div>

                  <div className="bg-green-50 p-3 rounded border">
                    <h4 className="font-semibold text-green-800">💰 Cotizaciones</h4>
                    <p className="text-sm text-green-600">{deleteData.cotizaciones.length} registros</p>
                    {deleteData.cotizaciones.slice(0, 2).map((c, i) => (
                      <p key={i} className="text-xs text-gray-600 mt-1">
                        • {c.solicitud?.folio} - {c.proveedor?.nombre}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded border">
                  <h4 className="font-semibold text-gray-800 mb-2">Resumen Total</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      Solicitudes: <span className="font-bold">{deleteData.solicitudes.length}</span>
                    </div>
                    <div>
                      Items: <span className="font-bold">{deleteData.solicitudItems.length}</span>
                    </div>
                    <div>
                      Cotizaciones: <span className="font-bold">{deleteData.cotizaciones.length}</span>
                    </div>
                    <div>
                      Adjuntos:{" "}
                      <span className="font-bold">
                        {deleteData.itemAdjuntos.length + deleteData.solicitudAdjuntos.length + deleteData.cotizacionAdjuntos.length + (deleteData.purchaseOrderAdjuntos?.length || 0)}
                      </span>
                    </div>
                    <div>
                      Logs: <span className="font-bold">{deleteData.solicitudLogs.length + deleteData.cotizacionLogs.length + (deleteData.purchaseOrderLogs?.length || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteAll} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Eliminando..." : "Confirmar Eliminación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
