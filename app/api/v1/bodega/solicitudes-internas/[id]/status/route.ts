/**
 * API: Actualizar Estado de Solicitud Interna
 * Archivo: app/api/v1/bodega/solicitudes-internas/[id]/status/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { bodegaInternalRequestService } from "@/lib/services/bodega/internal-request-service";
import { revalidatePath } from "next/cache";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (status === "PENDIENTE") {
      await bodegaInternalRequestService.sendToApproval(id, session.user.id);
    } else {
      // Otros cambios de estado genéricos podrían ir aquí, pero por ahora solo manejamos el envío
      return NextResponse.json({ error: "Estado no soportado vía este endpoint" }, { status: 400 });
    }

    revalidatePath("/bodega/solicitudes-internas");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en PATCH /api/v1/bodega/solicitudes-internas/[id]/status:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al cambiar estado de solicitud" }, { status: 500 });
  }
}
