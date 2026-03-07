"use client";

import DesktopView from "@/components/bodega/retiro/DesktopView";
import MobileView from "@/components/bodega/retiro/MobileView";

/**
 * Orquestador para edición de solicitudes internas.
 * Reutiliza las vistas de Retiro de Bodega en modo edición para mantener modularidad.
 */

interface ItemCarrito {
  articuloId: string;
  codigo: string;
  nombre: string;
  bodegaOrigenId: string;
  bodegaOrigenNombre: string;
  cantidad: number;
  stockDisponible: number;
  stockGlobal: number;
  unidad: string;
  bodegasStock?: { bodegaId: string; bodegaNombre: string; stock: number }[];
}

interface EditarSolicitudBodegaClientProps {
  initialData: {
    requestId: string;
    folio: string;
    warehouseId: string;
    justificacion: string;
    referencia: string;
    fechaRequerida: string;
    items: ItemCarrito[];
    fotosEvidencia: string[];
  };
}

export default function EditarSolicitudBodegaClient({ initialData }: EditarSolicitudBodegaClientProps) {
  return (
    <>
      {/* Versión móvil - Oculta en desktop (lg) */}
      <div className="lg:hidden">
        <MobileView initialData={initialData} isEditMode={true} />
      </div>

      {/* Versión escritorio - Oculta en móvil */}
      <div className="hidden lg:block">
        <DesktopView initialData={initialData} isEditMode={true} />
      </div>
    </>
  );
}
