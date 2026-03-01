"use client";

import React, { useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PackagePlus,
  PackageMinus,
  ArrowLeftRight,
  Search,
  ClipboardList,
  History,
  RotateCcw,
  Warehouse,
  Boxes,
  ArrowRight,
  MapPin,
  TrendingDown,
  TrendingUp,
  Settings,
  ShieldCheck,
  AlertCircle,
  Package,
  Trash2,
  FileText,
  Filter,
  Eye,
  Edit,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBodegaDashboardMetrics, useBodegasDashboard } from "@/lib/hooks/bodega/use-bodega-dashboard";
import { GlobalStockSearchModal } from "@/components/bodega/dashboard/GlobalStockSearchModal";
import { GlobalInventarioV2Table } from "@/components/bodega/GlobalInventarioV2Table";
import { StockGlobalTable } from "@/components/bodega/StockGlobalTable";
import { useBodegaAuth } from "@/lib/hooks/bodega/use-bodega-auth";

// ============================================================================
// Componentes Auxiliares
// ============================================================================

function MetricCard({ title, value, icon: Icon, color, description, isLoading, onClick }: any) {
  return (
    <Card
      className={`overflow-hidden border-none shadow-sm bg-white dark:bg-gray-900 transition-all hover:shadow-md ${onClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex items-stretch h-24">
          <div className={`w-2 ${color}`} />
          <div className="flex-1 p-4 flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">{isLoading ? "..." : value}</h3>
              {description && <span className="text-[10px] font-bold text-gray-400 lowercase">{description}</span>}
            </div>
          </div>
          <div className="p-4 flex items-center justify-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-gray-800 opacity-80`}>
              <Icon className={`w-6 h-6 stroke-[2.5px] ${color.replace("bg-", "text-")}`} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Vista Principal (Desktop)
// ============================================================================

function BodegaDashboardContent() {
  const router = useRouter();
  const { data: metrics, isLoading: loadingMetrics, refetch: refetchMetrics } = useBodegaDashboardMetrics();
  const { data: bodegas, isLoading: loadingBodegas } = useBodegasDashboard({ soloActivas: true });
  const { isStaff, isAdmin } = useBodegaAuth();

  const [stockSearchOpen, setStockSearchOpen] = useState(false);
  const [soloActivas, setSoloActivas] = useState(true);
  const [bodegaSearch, setBodegaSearch] = useState("");

  const quickActions = [
    {
      title: "Ingreso Bodega",
      description: "Cargar stock",
      icon: PackagePlus,
      href: "/bodega/ingreso-bodega",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
      borderColor: "border-emerald-200 dark:border-emerald-800/50",
      show: isStaff,
    },
    {
      title: "Retiro Artículos",
      description: "Salida inmediata",
      icon: PackageMinus,
      href: "/bodega/retiro-bodega",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/40",
      borderColor: "border-orange-200 dark:border-orange-800/50",
      show: true,
    },
    {
      title: "Movimiento",
      description: "Traslado interno",
      icon: ArrowLeftRight,
      href: "/bodega/movimiento-articulo",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
      borderColor: "border-blue-200 dark:border-blue-800/50",
      show: isStaff,
    },
    {
      title: "Consulta Stock",
      description: "Búsqueda global",
      icon: Search,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/40",
      borderColor: "border-purple-200 dark:border-purple-800/50",
      onClick: () => setStockSearchOpen(true),
      show: true,
    },
    {
      title: "Solicitudes",
      description: "Estado pedidos",
      icon: ClipboardList,
      href: "/bodega/solicitudes-internas",
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/40",
      borderColor: "border-indigo-200 dark:border-indigo-800/50",
      show: true,
    },
  ];

  const filteredBodegas = useMemo(() => {
    if (!bodegas) return [];
    return bodegas.filter((b) => {
      const matchesSearch = b.name.toLowerCase().includes(bodegaSearch.toLowerCase());
      const matchesStatus = soloActivas ? b.isActive : true;
      return matchesSearch && matchesStatus;
    });
  }, [bodegas, bodegaSearch, soloActivas]);

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in duration-500 p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Bodegas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestión centralizada de inventario y stock</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetchMetrics()}
            disabled={loadingMetrics}
            className="h-10 w-10 rounded-xl bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800"
          >
            <RotateCcw className={`w-4 h-4 ${loadingMetrics ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Stock Bajo Mínimo" value={metrics?.articulosBajoMinimo || 0} icon={TrendingDown} color="bg-red-500" description="artículos" isLoading={loadingMetrics} />
        <MetricCard title="Solicitudes Pendientes" value={metrics?.solicitudesPendientes || 0} icon={ClipboardList} color="bg-amber-500" description="registros" isLoading={loadingMetrics} />
        <MetricCard
          title="Total Catálogo"
          value={metrics?.totalArticulos || 0}
          icon={Package}
          color="bg-emerald-500"
          description="artículos"
          isLoading={loadingMetrics}
          onClick={() => setStockSearchOpen(true)}
        />
        <MetricCard title="Movimientos Hoy" value={metrics?.movimientosHoy || 0} icon={TrendingUp} color="bg-blue-500" description="registros" isLoading={loadingMetrics} />
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-blue-500" /> Operaciones de Bodega
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions
            .filter((a) => a.show)
            .map((action) => {
              const Wrapper = action.href ? Link : "button";
              const props = action.href ? { href: action.href } : { onClick: action.onClick, type: "button" as const };

              return (
                <Wrapper
                  key={action.title}
                  {...(props as any)}
                  className={`
                  group relative flex flex-col items-center justify-center p-5 rounded-2xl border-2
                  bg-white dark:bg-gray-900 shadow-sm transition-all duration-200
                  hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                  ${action.borderColor} cursor-pointer min-h-[140px]
                `}
                >
                  <div className={`mb-3 p-3 rounded-xl ${action.bgColor} transition-transform group-hover:scale-110`}>
                    <action.icon className={`h-6 w-6 ${action.color}`} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-tight text-gray-900 dark:text-gray-100">{action.title}</span>
                  <span className="mt-1 text-[10px] font-bold uppercase text-gray-400 tracking-tighter">{action.description}</span>
                </Wrapper>
              );
            })}
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="stock" className="w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
          <TabsList className="bg-transparent h-auto p-0 gap-8">
            <TabsTrigger
              value="stock"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-2 text-[11px] font-black uppercase tracking-widest text-gray-400 data-[state=active]:text-blue-600"
            >
              Stock
            </TabsTrigger>
            <TabsTrigger
              value="movimientos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-2 text-[11px] font-black uppercase tracking-widest text-gray-400 data-[state=active]:text-blue-600"
            >
              Movimientos
            </TabsTrigger>
            <TabsTrigger
              value="bodegas"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-2 text-[11px] font-black uppercase tracking-widest text-gray-400 data-[state=active]:text-blue-600"
            >
              Bodegas
            </TabsTrigger>
          </TabsList>

          <div className="hidden lg:flex items-center gap-2">
            <Link href="/bodega/reportes">
              <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest border-gray-200 dark:border-gray-700">
                <History className="w-3.5 h-3.5 mr-2 opacity-60" /> Reportes
              </Button>
            </Link>
            {isAdmin ? (
              <Link href="/bodega/maestros">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        <TabsContent value="stock" className="mt-0 focus-visible:outline-none">
          <StockGlobalTable />
        </TabsContent>

        <TabsContent value="movimientos" className="mt-0 focus-visible:outline-none">
          <GlobalInventarioV2Table />
        </TabsContent>

        <TabsContent value="bodegas" className="mt-0 focus-visible:outline-none space-y-4">
          <Card className="border shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-gray-950">
            <CardHeader className="bg-gray-50/50 dark:bg-gray-900 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-500">Gestión de Bodegas</CardTitle>
                </div>
                <div className="flex items-center gap-4">
                  <Label htmlFor="solo-activas" className="text-[10px] font-black uppercase text-gray-400 tracking-widest cursor-pointer">
                    Solo Activas
                  </Label>
                  <Switch id="solo-activas" checked={soloActivas} onCheckedChange={setSoloActivas} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Buscar bodega..." value={bodegaSearch} onChange={(e) => setBodegaSearch(e.target.value)} className="pl-10 h-10 rounded-xl" />
                </div>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {loadingBodegas ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50/50 dark:bg-gray-900/50">
                      <TableRow className="hover:bg-transparent border-gray-100 dark:border-gray-800">
                        <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest py-4">Sede / Nombre</TableHead>
                        <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Total Ítems</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4">Valor Stock</TableHead>
                        <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4 pr-6">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBodegas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-48 text-center text-gray-400 italic">
                            No se encontraron bodegas.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBodegas.map((bodega) => (
                          <TableRow key={bodega.id} className="group border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                            <TableCell className="pl-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-black text-xs uppercase tracking-tight text-gray-800 dark:text-gray-200">{bodega.name}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">{bodega.ubicacion || "Sin Ubicación"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <span className="text-xs font-black text-gray-700 dark:text-gray-300">{bodega.estadisticas?.totalItems || 0}</span>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <span className="text-xs font-black text-blue-600 dark:text-blue-400">${(bodega.estadisticas?.valorTotal || 0).toLocaleString("es-CL")}</span>
                            </TableCell>
                            <TableCell className="py-4 pr-6">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950">
                                  <Link href={`/bodega/bodegas/${bodega.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950">
                                  <Link href={`/bodega/maestros/bodegas?edit=${bodega.id}`}>
                                    <Edit className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Herramientas de Control - Solo Admin (Diseño solicitado) */}
      {isAdmin && (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-4xl p-8 space-y-6">
          <div className="flex items-center gap-3 text-slate-400">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-sm font-bold uppercase tracking-widest">Herramientas de Control</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <button
              onClick={() => router.push("/bodega/maestros/importar-cuadratura")}
              className="flex items-center gap-5 p-6 bg-white dark:bg-gray-900 rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left w-full group"
            >
              <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Importar Cuadratura</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">EXCEL GEOP RIO DULCE .XLSX</p>
              </div>
            </button>

            <button
              onClick={() => router.push("/bodega/maestros/limpiar-tablas")}
              className="flex items-center gap-5 p-6 bg-white dark:bg-gray-900 rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left w-full group"
            >
              <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl group-hover:scale-110 transition-transform">
                <Trash2 className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Limpiar Tablas</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">REINICIAR DATOS DE BODEGA</p>
              </div>
            </button>
          </div>
        </div>
      )}

      <GlobalStockSearchModal open={stockSearchOpen} onOpenChange={setStockSearchOpen} />
    </div>
  );
}

export default function DesktopView() {
  return (
    <Suspense fallback={<div className="w-full p-6 text-center text-muted-foreground animate-pulse">Cargando dashboard...</div>}>
      <BodegaDashboardContent />
    </Suspense>
  );
}
