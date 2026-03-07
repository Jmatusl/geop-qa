"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { CheckCircle2, ListChecks, PackageCheck, RefreshCw, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { useApplyBodegaMovement, useBodegaStockForVerification, useCompleteBodegaMovement, useBodegaToVerifyMovements } from "@/lib/hooks/bodega/use-bodega-verification";
import { VerificarMovimientoDialog } from "@/components/bodega/verificacion/VerificarMovimientoDialog";
import { Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BodegaVerificacionPage() {
  const [mounted, setMounted] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMovement, setSelectedMovement] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"EJECUTAR" | "VERIFICAR">("VERIFICAR");
  const [isTransitDialog, setIsTransitDialog] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: warehousesData } = useBodegaWarehouses(1, 100, "");
  const { data: toVerifyData, isLoading: loadingToVerify, isFetching: fetchingToVerify, refetch: refetchToVerify } = useBodegaToVerifyMovements({ warehouseId, search });
  const { data: stockData, isLoading: loadingStock, isFetching: fetchingStock, refetch: refetchStock } = useBodegaStockForVerification({ warehouseId, search });

  const applyMovement = useApplyBodegaMovement();
  const completeMovement = useCompleteBodegaMovement();

  const warehouses = warehousesData?.data ?? [];
  const toVerifyRows = toVerifyData?.data ?? [];
  const stockRows = stockData?.data ?? [];

  const regularVerifyRows = toVerifyRows.filter((r: any) => r.warehouse?.code !== "TRANSITO");
  const transitoRows = toVerifyRows.filter((r: any) => r.warehouse?.code === "TRANSITO");

  if (!mounted) return null;

  return (
    <div className="w-full space-y-4 p-0 lg:p-4">
      <div className="hidden lg:block">
        <BodegaBreadcrumb items={[{ label: "Bodega", href: "/bodega" }, { label: "Verificación" }]} />
      </div>

      {/* Header móvil */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b lg:hidden sticky top-0 z-40">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
          <Link href="/bodega">
            <RefreshCw className="h-4 w-4 -rotate-90" />
          </Link>
        </Button>
        <h1 className="text-sm font-extrabold uppercase tracking-widest text-[#283c7f] dark:text-blue-400">VERIFICACIÓN</h1>
        <div className="ml-auto text-[10px] font-bold text-slate-400">
          {mounted ? new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}
        </div>
      </div>

      <Card className="rounded-none lg:rounded-xl border-x-0 lg:border border-y lg:shadow-sm overflow-hidden">
        <CardHeader className="hidden lg:block">
          <CardTitle>Verificación de Stock</CardTitle>
          <CardDescription>Aplica movimientos pendientes y revisa estado actual del inventario.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 lg:p-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="flex items-center gap-2 lg:block">
              <div className="relative group flex-1">
                <Input 
                  value={search} 
                  onChange={(event) => setSearch(event.target.value)} 
                  placeholder="Buscar folio, repuesto o bodega..." 
                  autoComplete="off" 
                  className="h-10 lg:h-10 text-xs font-bold uppercase transition-all bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="lg:hidden h-10 w-10 shrink-0 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all active:scale-95"
                onClick={() => {
                  refetchToVerify();
                  refetchStock();
                }}
                disabled={loadingToVerify || fetchingToVerify || loadingStock || fetchingStock}
              >
                <RefreshCw className={cn("h-4 w-4", (loadingToVerify || fetchingToVerify || loadingStock || fetchingStock) && "animate-spin")} />
              </Button>
            </div>

            <Select value={warehouseId || "ALL"} onValueChange={(value) => setWarehouseId(value === "ALL" ? "" : value)}>
              <SelectTrigger className="w-full h-10 text-xs font-bold uppercase border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                <SelectValue placeholder="Todas las bodegas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs font-bold uppercase">Todas las bodegas</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id} className="text-xs font-bold uppercase">
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="hidden lg:flex lg:gap-2 lg:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-10 lg:w-auto lg:px-4 rounded-lg lg:rounded-md border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all active:scale-95"
                onClick={() => {
                  refetchToVerify();
                  refetchStock();
                }}
                disabled={loadingToVerify || fetchingToVerify || loadingStock || fetchingStock}
              >
                <RefreshCw className={cn("h-4 w-4", (loadingToVerify || fetchingToVerify || loadingStock || fetchingStock) && "animate-spin")} />
                <span className="hidden lg:ml-2 lg:inline text-[10px] font-black uppercase tracking-widest">Refrescar</span>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="verificar" className="w-full overflow-hidden">
            <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-slate-100/50 dark:bg-slate-900/50 lg:bg-muted lg:p-1 lg:h-10 no-scrollbar">
              <TabsTrigger value="verificar" className="flex-1 lg:flex-none text-[10px] font-black uppercase tracking-wider py-2 lg:py-1.5 px-4 lg:px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-md transition-all">
                <ListChecks className="mr-2 h-3.5 w-3.5" />
                <span>Movimientos</span>
              </TabsTrigger>
              <TabsTrigger value="transito" className="flex-1 lg:flex-none text-[10px] font-black uppercase tracking-wider py-2 lg:py-1.5 px-4 lg:px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-md transition-all">
                <ArrowRight className="mr-2 h-3.5 w-3.5 text-orange-500" />
                <span>Tránsito</span>
                {transitoRows.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-4 px-1 leading-none bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 text-[8px] font-black italic">
                    {transitoRows.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex-1 lg:flex-none text-[10px] font-black uppercase tracking-wider py-2 lg:py-1.5 px-4 lg:px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-md transition-all">
                <PackageCheck className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                <span>Buckets</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="verificar" className="mt-4 outline-none">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
                <div className="hidden lg:grid lg:grid-cols-[1.2fr_0.8fr_1.2fr_1fr_0.5fr_2.2fr] border-b bg-slate-50 dark:bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>Folio</span>
                  <span>Tipo</span>
                  <span>Bodega</span>
                  <span>Ejecución</span>
                  <span className="text-center">Items</span>
                  <span className="text-right">Acción</span>
                </div>
                {loadingToVerify ? (
                  <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Cargando datos...</div>
                ) : regularVerifyRows.length === 0 ? (
                  <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">No hay movimientos pendientes</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {regularVerifyRows.map((row: any) => (
                      <div key={row.id} className="flex flex-col lg:grid lg:grid-cols-[1.2fr_0.8fr_1.2fr_1fr_0.5fr_2.2fr] items-center p-4 lg:px-4 lg:py-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        {/* Mobile Layout */}
                        <div className="flex w-full items-start justify-between lg:hidden mb-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-black uppercase tracking-tight text-[#283c7f] dark:text-blue-400">{row.folio}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1 border-slate-200 text-slate-500">{row.movementType}</Badge>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{row.appliedAt ? new Date(row.appliedAt).toLocaleDateString("es-CL") : "—"}</span>
                            </div>
                          </div>
                          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold border-none">{row._count.items} ITEMS</Badge>
                        </div>
                        <div className="lg:hidden w-full text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-3 flex items-center gap-1.5">
                          <RefreshCw className="h-3 w-3 opacity-30" />
                          <span>Bodega Ej:</span>
                          <span className="text-slate-900 dark:text-slate-200">{row.warehouse.name}</span>
                        </div>

                        {/* Desktop Fields (Hidden in Mobile) */}
                        <span className="hidden lg:block font-bold text-xs uppercase tracking-tight">{row.folio}</span>
                        <span className="hidden lg:block text-xs font-medium uppercase">{row.movementType}</span>
                        <span className="hidden lg:block truncate text-xs">{row.warehouse.name}</span>
                        <span className="hidden lg:block text-xs tabular-nums text-slate-500">{row.appliedAt ? new Date(row.appliedAt).toLocaleDateString("es-CL") : "—"}</span>
                        <span className="hidden lg:block text-xs font-bold text-center">{row._count.items}</span>

                        {/* Actions (Common) */}
                        <div className="flex w-full lg:w-auto gap-2 lg:gap-1 lg:justify-end">
                          <Button type="button" variant="outline" size="sm" className="flex-1 lg:flex-none h-9 lg:h-8 text-[10px] font-black uppercase tracking-widest" asChild>
                            <Link href={`/bodega/movimientos/${row.id}`}>Ver Detalle</Link>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="flex-1 lg:flex-none h-9 lg:h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10 border-none transition-all active:scale-95"
                            onClick={() => {
                              fetch(`/api/v1/bodega/movimientos/${row.id}`)
                                .then((res) => res.json())
                                .then((res) => {
                                  const movement = res.data;
                                  if (movement) {
                                    setSelectedMovement(movement);
                                    setDialogMode("VERIFICAR");
                                    setIsTransitDialog(false);
                                    setIsDialogOpen(true);
                                  }
                                });
                            }}
                            disabled={isDialogOpen}
                          >
                            <PackageCheck className="mr-1.5 h-3.5 w-3.5" />
                            Verificar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="transito" className="mt-4 outline-none">
              <div className="rounded-xl border border-orange-200 dark:border-orange-500/20 overflow-hidden bg-white dark:bg-slate-950">
                <div className="hidden lg:grid lg:grid-cols-[1.2fr_0.8fr_1.2fr_1fr_0.5fr_2.2fr] border-b bg-orange-50/50 dark:bg-orange-950 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-orange-800 dark:text-orange-400">
                  <span>Folio</span>
                  <span>Tipo</span>
                  <span>Bodega Temporal</span>
                  <span>Fecha Envío</span>
                  <span className="text-center">Items</span>
                  <span className="text-right">Acción</span>
                </div>
                {loadingToVerify ? (
                  <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest italic animate-pulse">Cargando tránsito...</div>
                ) : transitoRows.length === 0 ? (
                  <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">No hay artículos en ruta</div>
                ) : (
                  <div className="divide-y divide-orange-100 dark:divide-orange-900/30">
                    {transitoRows.map((row: any) => (
                      <div key={row.id} className="flex flex-col lg:grid lg:grid-cols-[1.2fr_0.8fr_1.2fr_1fr_0.5fr_2.2fr] items-center p-4 lg:px-4 lg:py-3 hover:bg-orange-50/20 transition-colors">
                        {/* Mobile Layout */}
                        <div className="flex w-full items-start justify-between lg:hidden mb-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-black uppercase tracking-tight text-orange-700 dark:text-orange-400">{row.folio}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1 border-orange-200 text-orange-600">{row.movementType}</Badge>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{row.appliedAt ? new Date(row.appliedAt).toLocaleDateString("es-CL") : "—"}</span>
                            </div>
                          </div>
                          <Badge className="bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 text-[10px] font-bold border-none">{row._count.items} ITEMS</Badge>
                        </div>
                        <div className="lg:hidden w-full text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-3 flex items-center gap-1.5">
                          <RefreshCw className="h-3 w-3 opacity-30 -rotate-90 text-orange-500" />
                          <span>Punto de Tránsito:</span>
                          <span className="text-slate-900 dark:text-slate-200">{row.warehouse.name}</span>
                        </div>

                        {/* Desktop Fields */}
                        <span className="hidden lg:block font-bold text-xs uppercase tracking-tight text-orange-700 dark:text-orange-400">{row.folio}</span>
                        <span className="hidden lg:block text-xs font-medium uppercase">{row.movementType}</span>
                        <span className="hidden lg:block truncate text-xs">{row.warehouse.name}</span>
                        <span className="hidden lg:block text-xs tabular-nums text-slate-500">{row.appliedAt ? new Date(row.appliedAt).toLocaleDateString("es-CL") : "—"}</span>
                        <span className="hidden lg:block text-xs font-bold text-center">{row._count.items}</span>

                        {/* Actions */}
                        <div className="flex w-full lg:w-auto gap-2 lg:gap-1 lg:justify-end">
                          <Button type="button" variant="outline" size="sm" className="flex-1 lg:flex-none h-9 lg:h-8 text-[10px] font-black uppercase tracking-widest" asChild>
                            <Link href={`/bodega/movimientos/${row.id}`}>Detalle</Link>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="flex-1 lg:flex-none h-9 lg:h-8 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/10 border-none transition-all active:scale-95"
                            onClick={() => {
                              fetch(`/api/v1/bodega/movimientos/${row.id}`)
                                .then((res) => res.json())
                                .then((res) => {
                                  const movement = res.data;
                                  if (movement) {
                                    setSelectedMovement(movement);
                                    setDialogMode("VERIFICAR");
                                    setIsTransitDialog(true);
                                    setIsDialogOpen(true);
                                  }
                                });
                            }}
                            disabled={isDialogOpen}
                          >
                            <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                            Recepcionar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="stock" className="mt-4 outline-none">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
                <div className="hidden lg:grid lg:grid-cols-8 border-b bg-slate-50 dark:bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span className="col-span-2">Artículo</span>
                  <span>Bodega</span>
                  <span className="text-center">V: Verif.</span>
                  <span className="text-center">NV: No Verif.</span>
                  <span className="text-center">Total</span>
                  <span className="text-center">Disp.</span>
                  <span className="text-center">Estado</span>
                </div>
                {loadingStock ? (
                  <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Consultando Buckets...</div>
                ) : stockRows.length === 0 ? (
                  <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Sin información de stock</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {stockRows.map((row: any) => (
                      <div key={row.id} className="flex flex-col lg:grid lg:grid-cols-8 items-center p-4 lg:px-4 lg:py-3 hover:bg-slate-50/50 transition-colors">
                        {/* Mobile Stock Info */}
                        <div className="flex w-full items-start justify-between lg:hidden mb-2">
                          <div className="flex flex-col flex-1 min-w-0 pr-2">
                            <span className="text-xs font-black uppercase truncate text-slate-900 dark:text-slate-100">{row.article.name}</span>
                            <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter">[{row.article.code}]</span>
                          </div>
                          <Badge variant={row.article.lowStock ? "destructive" : "secondary"} className="h-4 px-1.5 text-[8px] font-black uppercase leading-none border-none shadow-sm">
                            {row.article.lowStock ? "CRÍTICO" : "OK"}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between w-full lg:hidden mb-1 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800/50">
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black uppercase text-slate-400 leading-none mb-1 tracking-widest">Verif.</span>
                            <span className="text-xs font-black text-emerald-600 tabular-nums">{row.stockVerificado}</span>
                          </div>
                          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black uppercase text-slate-400 leading-none mb-1 tracking-widest">N/V</span>
                            <span className="text-xs font-black text-amber-600 tabular-nums">{row.stockNoVerificado}</span>
                          </div>
                          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black uppercase text-slate-400 leading-none mb-1 tracking-widest">Dispon.</span>
                            <span className="text-xs font-black text-blue-600 tabular-nums">{row.availableQuantity}</span>
                          </div>
                        </div>

                        <div className="lg:hidden w-full text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 mt-1">
                          <Warehouse className="h-3 w-3 opacity-40 shrink-0" />
                          <span className="truncate">{row.warehouse.name}</span>
                        </div>

                        {/* Desktop Fields */}
                        <div className="hidden lg:flex lg:col-span-2 flex-col min-w-0 pr-4">
                          <span className="text-xs font-bold uppercase truncate">{row.article.name}</span>
                          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-tighter">[{row.article.code}]</span>
                        </div>
                        <span className="hidden lg:block truncate text-xs">{row.warehouse.name}</span>
                        <span className="hidden lg:block text-xs font-black text-emerald-600 text-center tabular-nums">{row.stockVerificado}</span>
                        <span className="hidden lg:block text-xs font-black text-amber-600 text-center tabular-nums">{row.stockNoVerificado}</span>
                        <span className="hidden lg:block text-xs font-black text-slate-400 text-center tabular-nums">{row.quantity}</span>
                        <span className="hidden lg:block text-xs font-black text-blue-700 dark:text-blue-400 text-center tabular-nums">{row.availableQuantity}</span>
                        <div className="hidden lg:flex justify-center">
                          <Badge variant={row.article.lowStock ? "destructive" : "secondary"} className="h-4 px-1 text-[9px] font-black uppercase border-none">
                            {row.article.lowStock ? "STOCK BAJO" : "STOCK OK"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <VerificarMovimientoDialog
        movement={selectedMovement}
        open={isDialogOpen}
        mode={dialogMode}
        isTransit={isTransitDialog}
        warehouses={warehouses.filter((w: any) => w.code !== "TRANSITO" && w.isActive)}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedMovement(null);
        }}
      />
    </div>
  );
}
