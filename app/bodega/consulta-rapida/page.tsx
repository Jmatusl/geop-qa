"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Info, Search, Warehouse } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBodegaQuickSearch } from "@/lib/hooks/bodega/use-bodega-quick-search";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";

function useDebounce<T>(value: T, delay = 450) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function ConsultaRapidaPage() {
  const [search, setSearch] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const debouncedSearch = useDebounce(search);

  const { data: warehousesData } = useBodegaWarehouses(1, 100, "");
  const { data, isLoading, error } = useBodegaQuickSearch(debouncedSearch, warehouseId || undefined);

  const warehouses = warehousesData?.data ?? [];

  return (
    <div className="w-full space-y-6 p-4 lg:p-6">
      <Card className="w-full rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" /> Consulta Rápida de Inventario
          </CardTitle>
          <CardDescription>Busca artículos por código o nombre y revisa disponibilidad en tiempo real.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por código o nombre..."
                autoComplete="off"
                className="w-full"
              />
            </div>
            <Select value={warehouseId || "ALL"} onValueChange={(value) => setWarehouseId(value === "ALL" ? "" : value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas las bodegas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las bodegas</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {search.trim().length < 2 ? (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">Ingresa al menos 2 caracteres para buscar.</div>
          ) : isLoading ? (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">Buscando artículos...</div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error instanceof Error ? error.message : "Error al consultar inventario"}</AlertDescription>
            </Alert>
          ) : (data?.resultados.length ?? 0) === 0 ? (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">No se encontraron artículos para los filtros seleccionados.</div>
          ) : (
            <div className="rounded-xl border">
              <div className="grid grid-cols-6 border-b bg-muted/40 px-4 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
                <span>Código</span>
                <span>Artículo</span>
                <span>Unidad</span>
                <span>Stock total</span>
                <span className="col-span-2">Bodegas</span>
              </div>
              {data?.resultados.map((article) => (
                <div key={article.id} className="grid grid-cols-6 border-b px-4 py-3 text-sm last:border-b-0">
                  <span className="font-mono font-semibold whitespace-nowrap">{article.codigo}</span>
                  <span className="truncate" title={article.nombre}>{article.nombre}</span>
                  <span>{article.unidad}</span>
                  <span className="font-semibold">{article.stockTotal.toFixed(2)}</span>
                  <div className="col-span-2 flex flex-wrap gap-1.5">
                    {article.bodegas.map((stock) => (
                      <Badge key={`${article.id}-${stock.bodegaId}`} variant={stock.bajoStock ? "destructive" : "secondary"}>
                        <Warehouse className="mr-1 h-3 w-3" />
                        {stock.bodegaCodigo}: {stock.cantidadDisponible.toFixed(2)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>Los badges rojos indican stock bajo según stock mínimo del artículo en la bodega.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
