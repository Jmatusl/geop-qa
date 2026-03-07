/**
 * API: Solicitudes Internas de Bodega
 * Archivo: app/api/v1/bodega/solicitudes-internas/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { bodegaInternalRequestFiltersSchema, createBodegaInternalRequestSchema } from "@/lib/validations/bodega-internal-request";
import { BodegaBusinessError, bodegaInternalRequestService } from "@/lib/services/bodega/internal-request-service";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryObject = Object.fromEntries(searchParams.entries());
    const filters = bodegaInternalRequestFiltersSchema.parse(queryObject);

    const result = await bodegaInternalRequestService.list(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error en GET /api/v1/bodega/solicitudes-internas:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Parámetros inválidos", details: error.errors }, { status: 400 });
    }

    if (error instanceof Error && error.name === "BodegaBusinessError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Error al obtener solicitudes internas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const data = createBodegaInternalRequestSchema.parse(body);

    const created = await bodegaInternalRequestService.create(data, session.user.id);

    await AuditLogger.logAction(request, session.user.id, {
      action: "CREATE",
      module: "bodega_solicitudes_internas",
      targetId: created.id,
      newData: {
        folio: created.folio,
        warehouseId: data.warehouseId,
        priority: data.priority,
        itemsCount: data.items.length,
      },
    });

    revalidatePath("/bodega/solicitudes-internas");

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/v1/bodega/solicitudes-internas:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 });
    }

    if (error instanceof Error && error.name === "BodegaBusinessError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Error al crear solicitud interna" }, { status: 500 });
  }
}
