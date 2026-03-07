import { notFound } from "next/navigation";
import { bodegaStockMovementService } from "@/lib/services/bodega/stock-movement-service";
import DetalleMovimientoDesktop from "@/components/bodega/movimientos/DetalleMovimientoDesktop";
import DetalleMovimientoMobile from "@/components/bodega/movimientos/DetalleMovimientoMobile";

interface PageProps {
  params: Promise<{ id: string }>;
}

function parseObservations(observations: string | null) {
  if (!observations) return { main: "", cc: "No asignado", docRef: null, cotizacion: null, guia: null };

  const parts = observations.split(" | ");
  let cc = "No asignado";
  let docRef = null;
  let cotizacion = null;
  let guia = null;
  const filteredParts: string[] = [];

  parts.forEach((part) => {
    if (part.startsWith("C. Costo: ")) cc = part.replace("C. Costo: ", "").trim();
    else if (part.startsWith("Doc. Ref: ")) docRef = part.replace("Doc. Ref: ", "").trim();
    else if (part.startsWith("N° Cotización: ")) cotizacion = part.replace("N° Cotización: ", "").trim();
    else if (part.startsWith("Guía Despacho: ")) guia = part.replace("Guía Despacho: ", "").trim();
    else if (part.startsWith("Justificación: ")) filteredParts.push(part.replace("Justificación: ", "").trim());
    else if (part.startsWith("ORIGEN: ")) {
      /* Skip */
    } else if (part.startsWith("DESTINO: ")) {
      /* Skip */
    } else if (part.startsWith("Verificación Automática: ")) {
      /* Skip */
    } else filteredParts.push(part);
  });

  return {
    main: filteredParts.join(" | "),
    cc,
    docRef,
    cotizacion,
    guia,
  };
}

export default async function BodegaMovimientoDetallePage({ params }: PageProps) {
  const { id } = await params;

  const movement = await bodegaStockMovementService.getMovementById(id);

  if (!movement) {
    notFound();
  }

  const creationDateFull = new Date(movement.createdAt).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const creationDateShort = new Date(movement.createdAt).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const appliedDateShort = movement.appliedAt
    ? new Date(movement.appliedAt).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : creationDateShort;

  const creatorName = `${(movement as any).creator.firstName} ${(movement as any).creator.lastName}`;
  const parsedObs = parseObservations(movement.observations);

  // Serializar para Client Components (Decimal y Date no son planos)
  const movementDto = {
    ...movement,
    createdAt: movement.createdAt.toISOString(),
    updatedAt: movement.updatedAt.toISOString(),
    appliedAt: movement.appliedAt?.toISOString() || null,
    totalItems: Number(movement.totalItems || 0),
    totalPrice: Number(movement.totalPrice || 0),
    items: movement.items.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      unitCost: Number(item.unitCost || 0),
      initialBalance: Number(item.initialBalance || 0),
      currentBalance: Number(item.currentBalance || 0),
      cantidadVerificada: item.cantidadVerificada ? Number(item.cantidadVerificada) : null,
      fechaVerificacion: item.fechaVerificacion?.toISOString() || null,
      createdAt: item.createdAt.toISOString(),
    })),
  };

  return (
    <div className="w-full">
      {/* Versión móvil */}
      <div className="lg:hidden">
        <DetalleMovimientoMobile 
          movement={movementDto} 
          parsedObs={parsedObs} 
          creationDate={creationDateShort}
          appliedDate={appliedDateShort}
        />
      </div>

      {/* Versión escritorio */}
      <div className="hidden lg:block">
        <DetalleMovimientoDesktop 
          movement={movementDto} 
          parsedObs={parsedObs}
          creationDateFull={creationDateFull}
          creationDateShort={creationDateShort}
          appliedDateShort={appliedDateShort}
          creatorName={creatorName}
        />
      </div>
    </div>
  );
}
