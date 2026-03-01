"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";
import { CrearMovimientoCompacto } from "@/components/bodega/movimientos/CrearMovimientoCompacto";

export default function DesktopView() {
  const router = useRouter();

  const handleCancel = () => {
    router.push("/bodega");
  };

  return (
    <div className="flex flex-col gap-4 p-0 bg-gray-50/30 dark:bg-transparent min-h-screen">
      {/* Breadcrumb Simplificado */}
      <div className="mb-2">
        <BodegaBreadcrumb items={[{ label: "Bodega", href: "/bodega" }, { label: "Movimientos", href: "/bodega/movimientos" }, { label: "Ingreso Bodega" }]} />
      </div>

      {/* Formulario Compacto de Un Solo Paso */}
      <Suspense fallback={<div className="flex items-center justify-center p-8 text-muted-foreground italic">Cargando formulario...</div>}>
        <CrearMovimientoCompacto onCancel={handleCancel} tipoInicial="INGRESO" ocultarTipoOperacion={true} titulo="INGRESO BODEGA" skipTransitoFilter={true} />
      </Suspense>
    </div>
  );
}
