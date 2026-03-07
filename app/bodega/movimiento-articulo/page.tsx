"use client";

import { Suspense, useEffect, useState } from "react";
import { TransferenciaArticuloUI } from "@/components/bodega/movimientos/TransferenciaArticuloUI";
import { TransferenciaArticuloDesktop } from "@/components/bodega/movimientos/TransferenciaArticuloDesktop";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";

export default function MovimientoArticuloPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="flex items-center justify-center p-8 text-muted-foreground">Cargando...</div>;
  }

  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-4">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="uppercase font-black text-[10px] tracking-[0.3em]">Cargando formulario...</span>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-0 bg-gray-50/30 dark:bg-transparent min-h-screen">
        <div className="hidden lg:block mb-2">
          <BodegaBreadcrumb items={[{ label: "Bodega", href: "/bodega" }, { label: "Movimientos", href: "/bodega/movimientos" }, { label: "Movimiento Artículo (Transferencia)" }]} />
        </div>

        <div className="w-full">
          {/* Versión móvil */}
          <div className="block lg:hidden">
            <TransferenciaArticuloUI />
          </div>

          {/* Versión escritorio */}
          <div className="hidden lg:block">
            <TransferenciaArticuloDesktop onCancel={() => router.push("/bodega/movimientos")} />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
