"use client";

import { useState } from "react";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBodegaLots } from "@/lib/hooks/bodega/use-bodega-lots";
import { useCreateBodegaLot } from "@/lib/hooks/bodega/use-bodega-lots";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { useBodegaArticles } from "@/lib/hooks/bodega/use-bodega-articles";

const MOVEMENT_STATUSES = ["PENDIENTE", "APROBADO", "RECHAZADO", "APLICADO"];

function getStatusVariant(status: string) {
  if (status === "APLICADO") return "secondary" as const;
  if (status === "APROBADO") return "default" as const;
  return "outline" as const;
}

export default function BodegaLotesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [articleId, setArticleId] = useState("");
  const [status, setStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newWarehouseId, setNewWarehouseId] = useState("");
  const [newArticleId, setNewArticleId] = useState("");
  const [newInitialQuantity, setNewInitialQuantity] = useState("1");
  const [newExpirationDate, setNewExpirationDate] = useState("");

  const { data, isLoading } = useBodegaLots({
    page,
    pageSize: 20,
    search,
    warehouseId,
    articleId,
    status,
  });
  const { data: warehousesData } = useBodegaWarehouses(1, 100, "");
  const { data: articlesData } = useBodegaArticles(1, 100, "");
  const createLot = useCreateBodegaLot();

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const warehouses = warehousesData?.data ?? [];
  const articles = articlesData?.data ?? [];

  const clearFilters = () => {
    setSearch("");
    setWarehouseId("");
    setArticleId("");
    setStatus("");
    setPage(1);
  };

  const handleCreateLot = async () => {
    if (!newCode || !newWarehouseId || !newArticleId) return;

    await createLot.mutateAsync({
      code: newCode,
      warehouseId: newWarehouseId,
      articleId: newArticleId,
      initialQuantity: Number(newInitialQuantity || "0"),
      expirationDate: newExpirationDate ? new Date(newExpirationDate).toISOString() : null,
    });

    setShowCreate(false);
    setNewCode("");
    setNewWarehouseId("");
    setNewArticleId("");
    setNewInitialQuantity("1");
    setNewExpirationDate("");
  };

  return (
    <div className="w-full space-y-4 p-4 lg:p-6">
      <BodegaBreadcrumb items={[{ label: "Bodega", href: "/bodega" }, { label: "Lotes" }]} />

      <Card className="w-full rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle>Gestión de Lotes</CardTitle>
          <CardDescription>Trazabilidad por lotes lógicos desde movimientos de inventario.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white" onClick={() => setShowCreate((prev) => !prev)}>
              {showCreate ? "Cerrar alta" : "Nuevo lote"}
            </Button>
          </div>

          {showCreate ? (
            <div className="grid grid-cols-1 gap-3 rounded-xl border p-4 lg:grid-cols-6">
              <Input value={newCode} onChange={(event) => setNewCode(event.target.value)} placeholder="Código lote" autoComplete="off" className="w-full" />
              <Select value={newWarehouseId} onValueChange={setNewWarehouseId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Bodega" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newArticleId} onValueChange={setNewArticleId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Artículo" /></SelectTrigger>
                <SelectContent>
                  {articles.map((article) => (
                    <SelectItem key={article.id} value={article.id}>{article.code} - {article.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" min={1} value={newInitialQuantity} onChange={(event) => setNewInitialQuantity(event.target.value)} placeholder="Cantidad" autoComplete="off" className="w-full" />
              <Input type="date" value={newExpirationDate} onChange={(event) => setNewExpirationDate(event.target.value)} autoComplete="off" className="w-full" />
              <Button type="button" onClick={handleCreateLot} disabled={createLot.isPending} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white">
                Guardar lote
              </Button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por lote, artículo o bodega"
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

            <Select value={articleId || "ALL"} onValueChange={(value) => { setArticleId(value === "ALL" ? "" : value); setPage(1); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos los artículos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los artículos</SelectItem>
                {articles.map((article) => (
                  <SelectItem key={article.id} value={article.id}>{article.code} - {article.name}</SelectItem>
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
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={clearFilters} className="dark:text-white">Limpiar filtros</Button>
          </div>

          <div className="rounded-xl border">
            <div className="grid grid-cols-6 border-b bg-muted/40 px-4 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <span>Lote</span>
              <span>Artículo</span>
              <span>Bodega</span>
              <span>Cantidad</span>
              <span>Fecha</span>
              <span>Estado</span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Cargando lotes...</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No hay lotes para los filtros seleccionados.</div>
            ) : (
              rows.map((row) => (
                <div key={row.id} className="grid grid-cols-6 items-center border-b px-4 py-3 text-sm last:border-b-0">
                  <span className="font-semibold whitespace-nowrap">{row.loteCode}</span>
                  <span className="truncate">{row.article.name}</span>
                  <span className="truncate">{row.warehouse.name}</span>
                  <span>{Number(row.quantity)} {row.article.unit}</span>
                  <span>{new Date(row.createdAt).toLocaleDateString("es-CL")}</span>
                  <span><Badge variant={getStatusVariant(row.status)}>{row.status}</Badge></span>
                </div>
              ))
            )}
          </div>

          {meta ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Página {meta.page} de {meta.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={meta.page <= 1}>Anterior</Button>
                <Button variant="outline" onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))} disabled={meta.page >= meta.totalPages}>Siguiente</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
