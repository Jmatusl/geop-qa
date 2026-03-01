"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";
import { CrearMovimientoCompacto } from "@/components/bodega/movimientos";
import { Loader2 } from "lucide-react";

function MovimientoArticuloContent() {
  const router = useRouter();

  const handleCancel = () => {
    router.push("/bodega/movimientos");
  };

  return (
    <div className="flex flex-col gap-4 p-0 bg-gray-50/30 dark:bg-transparent min-h-screen">
      {/* Breadcrumb Simplificado */}
      <div className="mb-2">
        <BodegaBreadcrumb items={[{ label: "Bodega", href: "/bodega" }, { label: "Movimientos", href: "/bodega/movimientos" }, { label: "Movimiento Artículo (Transferencia)" }]} />
      </div>

      {/* Formulario Compacto de Un Solo Paso - Configurado para Transferencia y sin C. Costo */}
      <CrearMovimientoCompacto onCancel={handleCancel} tipoInicial="INGRESO_TRANSFERENCIA" ocultarCentroCosto={true} ocultarTipoOperacion={true} sinDestinoPorDefecto={true} titulo="MOVIMIENTO" />
    </div>
  );
}

export default function DesktopView() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-4">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="uppercase font-black text-[10px] tracking-[0.3em]">Cargando formulario...</span>
        </div>
      }
    >
      <MovimientoArticuloContent />
    </Suspense>
  );
}
