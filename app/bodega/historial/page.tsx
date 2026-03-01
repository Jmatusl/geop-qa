"use client";

/**
 * PÁGINA — Historial de Movimientos de Bodega
 *
 * Orquestador del patrón adaptativo:
 * - Móvil (lg:hidden): lista de movimientos paginada con tarjetas expandibles
 * - Desktop (hidden lg:block): tabla de historial con filtros avanzados
 */

import { Suspense } from "react";
import MobileView from "@/components/bodega/historial/MobileView";
import DesktopView from "@/components/bodega/movimientos/DesktopView";

export default function BodegaHistorialPage() {
  return (
    <div className="w-full">
      {/* Vista móvil — lista de movimientos paginada con filtros */}
      <div className="lg:hidden">
        <Suspense fallback={<div className="flex items-center justify-center p-8 text-muted-foreground text-sm">Cargando historial...</div>}>
          <MobileView />
        </Suspense>
      </div>

      {/* Vista desktop — tabla historial de movimientos */}
      <div className="hidden lg:block">
        <DesktopView />
      </div>
    </div>
  );
}
