"use client";

import { Suspense, useEffect, useState } from "react";
import DesktopView from "@/components/bodega/ingreso/DesktopView";
import MobileView from "@/components/bodega/ingreso/MobileView";

export default function IngresoBodegaPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="flex items-center justify-center p-8 text-muted-foreground">Cargando...</div>;
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8 text-muted-foreground">Cargando formulario...</div>}>
      <div className="hidden lg:block">
        <DesktopView />
      </div>
      <div className="lg:hidden">
        <MobileView />
      </div>
    </Suspense>
  );
}
