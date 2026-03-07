/**
 * API: Confirmar entrega final de solicitud interna
 * POST /api/v1/bodega/solicitudes-internas/[id]/confirmar-entrega
 *
 * Requiere estado LISTA_PARA_ENTREGA.
 * Registra firma digital, foto de evidencia y datos del receptor.
 * Cambia el estado a ENTREGADA.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/auth/session";
import { bodegaInternalRequestService } from "@/lib/services/bodega/internal-request-service";

const bodySchema = z.object({
  receptorNombre: z.string().min(3, "Mínimo 3 caracteres").max(100),
  receptorRut: z.string().optional(),
  firmaReceptor: z.string().min(1, "La firma es requerida"),
  fotoEvidencia: z.string().optional(),
  observations: z.string().max(1000).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.issues }, { status: 400 });
    }

    await bodegaInternalRequestService.confirmEntrega(id, parsed.data, session.userId);

    return NextResponse.json({ ok: true, message: "Entrega confirmada exitosamente" });
  } catch (error: any) {
    console.error("Error en POST /api/v1/bodega/solicitudes-internas/[id]/confirmar-entrega:", error);
    if (error?.name === "BodegaBusinessError") {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
