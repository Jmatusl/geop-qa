"use client";

import { Suspense, useEffect, useState } from "react";
import DesktopView from "@/components/bodega/movimientos/DesktopView";
import MobileView from "@/components/bodega/movimientos/MobileView";

export default function BodegaMovimientosPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="flex items-center justify-center p-8 text-muted-foreground">Cargando...</div>;
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8 text-muted-foreground">Cargando movimientos...</div>}>
      <div className="hidden lg:block">
        <DesktopView />
      </div>
      <div className="lg:hidden">
        <MobileView />
      </div>
    </Suspense>
  );
}
