"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PackagePlus, PackageMinus, ArrowLeftRight, Search, History, Warehouse, Boxes, RotateCcw, TrendingDown, type LucideIcon } from "lucide-react";
import { useBodegaDashboardMetrics, useBodegasDashboard } from "@/lib/hooks/bodega/use-bodega-dashboard";
import { useBodegaAuth } from "@/lib/hooks/bodega/use-bodega-auth";
import { ConsultarStockModalV2 } from "./ConsultarStockModalV2";
import { LowStockArticlesModal } from "./LowStockArticlesModal";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";

// ============================================================================
// Tipos
// ============================================================================

interface DashboardCard {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  color: string;
  bgColor: string;
  borderColor: string;
  onClick?: () => void;
}

// ============================================================================
// Componente de Tarjeta
// ============================================================================

function CardItem({ card }: { card: DashboardCard }) {
  const Wrapper = card.href ? Link : "button";
  const wrapperProps = card.href ? { href: card.href } : { onClick: card.onClick, type: "button" as const };

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={`
        group relative flex flex-col items-center justify-center p-5 rounded-2xl
        border-2 transition-all duration-200 active:scale-[0.97]
        bg-white dark:bg-gray-900 shadow-sm
        ${card.borderColor} hover:border-opacity-80
        min-h-[135px] w-full
      `}
    >
      <div
        className={`
        flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-inner
        ${card.bgColor} transition-transform group-hover:scale-110
      `}
      >
        <card.icon className={`w-7 h-7 ${card.color}`} />
      </div>

      <span className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight text-center leading-tight">{card.title}</span>

      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase text-center tracking-tighter">{card.description}</span>
    </Wrapper>
  );
}

// ============================================================================
// Componente Principal — Dashboard Móvil
// ============================================================================

export default function MobileView() {
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [lowStockOpen, setLowStockOpen] = useState(false);
  const { data: metrics } = useBodegaDashboardMetrics();

  const cards: DashboardCard[] = [
    {
      title: "Ingreso Bodega",
      description: "Cargar stock",
      icon: PackagePlus,
      href: "/bodega/ingreso-bodega",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
      borderColor: "border-emerald-100 dark:border-emerald-800/50",
    },
    {
      title: "Retiro Artículos",
      description: "Salida rápida",
      icon: PackageMinus,
      href: "/bodega/retiro-bodega",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/40",
      borderColor: "border-orange-100 dark:border-orange-800/50",
    },
    {
      title: "Movimiento",
      description: "Traslado interno",
      icon: ArrowLeftRight,
      href: "/bodega/movimiento-articulo",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
      borderColor: "border-blue-100 dark:border-blue-800/50",
    },
    {
      title: "Consulta Stock",
      description: "Búsqueda global",
      icon: Search,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/40",
      borderColor: "border-purple-100 dark:border-purple-800/50",
      onClick: () => setStockModalOpen(true),
    },
    {
      title: "Historial",
      description: "Resumen de flujo",
      icon: History,
      href: "/bodega/historial",
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-50 dark:bg-slate-950/40",
      borderColor: "border-slate-100 dark:border-slate-800/50",
    },
    {
      title: "Movimientos",
      description: "Todos los registros",
      icon: Boxes,
      href: "/bodega/movimientos",
      color: "text-blue-800 dark:text-blue-400",
      bgColor: "bg-blue-100/50 dark:bg-blue-900/30",
      borderColor: "border-blue-200 dark:border-blue-700/50",
    },
    {
      title: "Stock Bajo",
      description: `${metrics?.articulosBajoMinimo || 0} críticas`,
      icon: TrendingDown,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/40",
      borderColor: "border-red-100 dark:border-red-800/50",
      onClick: () => setLowStockOpen(true),
    },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 px-1">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30">
          <Warehouse className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bodega</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestión simplificada</p>
        </div>
        <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-400" onClick={() => window.location.reload()}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Grid de tarjetas (2 columnas) */}
      <div className="grid grid-cols-2 gap-3.5 px-0.5">
        {cards.slice(0, 4).map((card) => (
          <CardItem key={card.title} card={card} />
        ))}
      </div>

      {/* Separador Visual */}
      <div className="flex items-center gap-4 my-6 px-1">
        <div className="h-[2px] flex-1 bg-gray-100 dark:bg-gray-800 rounded-full" />
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Reportes y Datos</span>
        <div className="h-[2px] flex-1 bg-gray-100 dark:bg-gray-800 rounded-full" />
      </div>

      {/* Historial e Inventario */}
      <div className="grid grid-cols-2 gap-3.5 px-0.5">
        <CardItem card={cards[4]} />
        <CardItem card={cards[5]} />
      </div>

      <ConsultarStockModalV2 open={stockModalOpen} onOpenChange={setStockModalOpen} />
      <LowStockArticlesModal open={lowStockOpen} onOpenChange={setLowStockOpen} />
    </div>
  );
}
