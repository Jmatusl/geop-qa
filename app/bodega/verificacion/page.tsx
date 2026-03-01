"use client";

import { useState } from "react";
import { CheckCircle2, ListChecks, PackageCheck, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { useApplyBodegaMovement, useBodegaPendingMovements, useBodegaStockForVerification } from "@/lib/hooks/bodega/use-bodega-verification";

export default function BodegaVerificacionPage() {
  const [warehouseId, setWarehouseId] = useState("");
  const [search, setSearch] = useState("");

  const { data: warehousesData } = useBodegaWarehouses(1, 100, "");
  const { data: pendingData, isLoading: loadingPending, isFetching: fetchingPending, refetch: refetchPending } = useBodegaPendingMovements({ warehouseId, search });
  const { data: stockData, isLoading: loadingStock, isFetching: fetchingStock, refetch: refetchStock } = useBodegaStockForVerification({ warehouseId, search });
  const applyMovement = useApplyBodegaMovement();

  const warehouses = warehousesData?.data ?? [];
  const pendingRows = pendingData?.data ?? [];
  const stockRows = stockData?.data ?? [];

  return (
    <div className="w-full space-y-4 p-4 lg:p-6">
      <BodegaBreadcrumb items={[{ label: "Bodega", href: "/bodega" }, { label: "Verificación" }]} />

      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle>Verificación de Stock</CardTitle>
          <CardDescription>Aplica movimientos pendientes y revisa estado actual del inventario.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por folio, artículo o bodega"
              autoComplete="off"
            />
            <Select value={warehouseId || "ALL"} onValueChange={(value) => setWarehouseId(value === "ALL" ? "" : value)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Todas las bodegas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las bodegas</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => refetchPending()} disabled={loadingPending || fetchingPending}>
                <RefreshCw className={`h-4 w-4 ${(loadingPending || fetchingPending) ? "animate-spin" : ""}`} />
              </Button>
              <Button type="button" variant="outline" onClick={() => refetchStock()} disabled={loadingStock || fetchingStock}>
                <RefreshCw className={`h-4 w-4 ${(loadingStock || fetchingStock) ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="movimientos" className="w-full">
            <TabsList>
              <TabsTrigger value="movimientos"><ListChecks className="mr-2 h-4 w-4" />Movimientos pendientes</TabsTrigger>
              <TabsTrigger value="stock"><PackageCheck className="mr-2 h-4 w-4" />Stock actual</TabsTrigger>
            </TabsList>

            <TabsContent value="movimientos" className="mt-4">
              <div className="rounded-xl border">
                <div className="grid grid-cols-6 border-b bg-muted/40 px-4 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
                  <span>Folio</span>
                  <span>Tipo</span>
                  <span>Bodega</span>
                  <span>Fecha</span>
                  <span>Items</span>
                  <span>Acción</span>
                </div>
                {loadingPending ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">Cargando movimientos pendientes...</div>
                ) : pendingRows.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No hay movimientos pendientes para verificar.</div>
                ) : (
                  pendingRows.map((row: any) => (
                    <div key={row.id} className="grid grid-cols-6 items-center border-b px-4 py-3 text-sm last:border-b-0">
                      <span className="font-semibold whitespace-nowrap">{row.folio}</span>
                      <span>{row.movementType}</span>
                      <span className="truncate">{row.warehouse.name}</span>
                      <span>{new Date(row.createdAt).toLocaleDateString("es-CL")}</span>
                      <span>{row._count.items}</span>
                      <span>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white"
                          onClick={() => applyMovement.mutate({ movementId: row.id })}
                          disabled={applyMovement.isPending}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4 text-white" />
                          Aplicar
                        </Button>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="stock" className="mt-4">
              <div className="rounded-xl border">
                <div className="grid grid-cols-7 border-b bg-muted/40 px-4 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
                  <span>Artículo</span>
                  <span>Código</span>
                  <span>Bodega</span>
                  <span>Stock</span>
                  <span>Reservado</span>
                  <span>Disponible</span>
                  <span>Estado</span>
                </div>
                {loadingStock ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">Cargando stock...</div>
                ) : stockRows.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No hay stock para los filtros seleccionados.</div>
                ) : (
                  stockRows.map((row: any) => (
                    <div key={row.id} className="grid grid-cols-7 border-b px-4 py-3 text-sm last:border-b-0">
                      <span className="truncate">{row.article.name}</span>
                      <span className="font-mono">{row.article.code}</span>
                      <span className="truncate">{row.warehouse.name}</span>
                      <span>{row.quantity}</span>
                      <span>{row.reservedQuantity}</span>
                      <span>{row.availableQuantity}</span>
                      <span>
                        <Badge variant={row.article.lowStock ? "destructive" : "secondary"}>
                          {row.article.lowStock ? "Stock bajo" : "OK"}
                        </Badge>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
