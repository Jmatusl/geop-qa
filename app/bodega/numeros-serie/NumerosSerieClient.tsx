"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBodegaSeries } from "@/lib/hooks/bodega/use-bodega-series";
import { useCreateBodegaSeries } from "@/lib/hooks/bodega/use-bodega-series";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { useBodegaLots } from "@/lib/hooks/bodega/use-bodega-lots";
import { Button } from "@/components/ui/button";

const MOVEMENT_STATUSES = ["PENDIENTE", "APROBADO", "RECHAZADO", "APLICADO"];

function getStatusVariant(status: string) {
  if (status === "APLICADO") return "secondary" as const;
  if (status === "APROBADO") return "default" as const;
  return "outline" as const;
}

export default function NumerosSerieClient() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [status, setStatus] = useState("");
  const [articleId, setArticleId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newLotId, setNewLotId] = useState("");
  const [newSerialNumber, setNewSerialNumber] = useState("");

  const { data, isLoading } = useBodegaSeries({
    page,
    pageSize: 20,
    search,
    warehouseId,
    status,
    articleId,
  });
  const { data: warehousesData } = useBodegaWarehouses(1, 100, "");
  const { data: lotsData } = useBodegaLots({ page: 1, pageSize: 100 });
  const createSeries = useCreateBodegaSeries();

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const warehouses = warehousesData?.data ?? [];
  const lots = lotsData?.data ?? [];

  const handleCreateSeries = async () => {
    if (!newLotId || !newSerialNumber) return;
    await createSeries.mutateAsync({ lotId: newLotId, serialNumber: newSerialNumber });
    setShowCreate(false);
    setNewLotId("");
    setNewSerialNumber("");
  };

  return (
    <Card className="w-full rounded-xl border shadow-sm">
      <CardHeader>
        <CardTitle>Números de Serie</CardTitle>
        <CardDescription>Trazabilidad serializada de ítems en movimientos de bodega.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button type="button" className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white" onClick={() => setShowCreate((prev) => !prev)}>
            {showCreate ? "Cerrar alta" : "Nuevo serie"}
          </Button>
        </div>

        {showCreate ? (
          <div className="grid grid-cols-1 gap-3 rounded-xl border p-4 lg:grid-cols-3">
            <Select value={newLotId} onValueChange={setNewLotId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Lote" /></SelectTrigger>
              <SelectContent>
                {lots.map((lot) => (
                  <SelectItem key={lot.id} value={lot.id}>{lot.loteCode} · {lot.article.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={newSerialNumber} onChange={(event) => setNewSerialNumber(event.target.value)} placeholder="Número de serie" autoComplete="off" className="w-full" />
            <Button type="button" onClick={handleCreateSeries} disabled={createSeries.isPending} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white">
              Guardar serie
            </Button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por serie, folio o artículo"
            autoComplete="off"
          />

          <Select value={warehouseId || "ALL"} onValueChange={(value) => { setWarehouseId(value === "ALL" ? "" : value); setPage(1); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas las bodegas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las bodegas</SelectItem>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status || "ALL"} onValueChange={(value) => { setStatus(value === "ALL" ? "" : value); setPage(1); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              {MOVEMENT_STATUSES.map((movementStatus) => (
                <SelectItem key={movementStatus} value={movementStatus}>{movementStatus}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={articleId}
            onChange={(event) => {
              setArticleId(event.target.value);
              setPage(1);
            }}
            placeholder="Filtrar por ID artículo"
            autoComplete="off"
          />
        </div>

        <div className="rounded-xl border">
          <div className="grid grid-cols-5 border-b bg-muted/40 px-4 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <span>Serie</span>
            <span>Artículo</span>
            <span>Bodega</span>
            <span>Folio</span>
            <span>Estado</span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cargando números de serie...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No hay números de serie para los filtros seleccionados.</div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="grid grid-cols-5 border-b px-4 py-3 text-sm last:border-b-0">
                <span className="font-mono font-semibold">{row.serialNumber}</span>
                <span>{row.article.name}</span>
                <span>{row.warehouse.name}</span>
                <span>{row.sourceFolio}</span>
                <span>
                  <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
                </span>
              </div>
            ))
          )}
        </div>

        {meta ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Página {meta.page} de {meta.totalPages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 disabled:opacity-50"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={meta.page <= 1}
              >
                Anterior
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 disabled:opacity-50"
                onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))}
                disabled={meta.page >= meta.totalPages}
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
