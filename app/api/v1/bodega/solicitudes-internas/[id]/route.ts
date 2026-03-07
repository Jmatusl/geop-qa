/**
 * API: Detalle de Solicitud Interna de Bodega
 * Archivo: app/api/v1/bodega/solicitudes-internas/[id]/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { bodegaInternalRequestService } from "@/lib/services/bodega/internal-request-service";
import { updateBodegaInternalRequestSchema } from "@/lib/validations/bodega-internal-request";
import { AuditLogger } from "@/lib/audit/logger";
import { z } from "zod";
import { revalidatePath } from "next/cache";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const request = await bodegaInternalRequestService.getById(id);

    if (!request) {
      return NextResponse.json({ error: "Solicitud interna no encontrada" }, { status: 404 });
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error("Error en GET /api/v1/bodega/solicitudes-internas/[id]:", error);
    return NextResponse.json({ error: "Error al obtener detalle de solicitud interna" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateBodegaInternalRequestSchema.parse(body);

    await bodegaInternalRequestService.update(id, data, session.user.id);

    await AuditLogger.logAction(request, session.user.id, {
      action: "UPDATE",
      module: "bodega_solicitudes_internas",
      targetId: id,
      newData: {
        title: data.title,
        priority: data.priority,
        itemsCount: data.items.length,
      },
    });

    revalidatePath("/bodega/solicitudes-internas");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en PATCH /api/v1/bodega/solicitudes-internas/[id]:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Error al actualizar solicitud interna" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    await bodegaInternalRequestService.delete(id, session.user.id);

    revalidatePath("/bodega/solicitudes-internas");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/v1/bodega/solicitudes-internas/[id]:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al eliminar solicitud" }, { status: 500 });
  }
}
