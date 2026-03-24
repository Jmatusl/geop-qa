import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { bodegaTransactionFiltersSchema } from "@/lib/validations/bodega-transaction";
import { bodegaTransactionService, BodegaTransactionError } from "@/lib/services/bodega/transaction-service";
import { bodegaInternalRequestService, BodegaBusinessError } from "@/lib/services/bodega/internal-request-service";
import { createBodegaInternalRequestSchema } from "@/lib/validations/bodega-internal-request";
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

    const filters = bodegaTransactionFiltersSchema.parse({
      ...queryObject,
      type: "RETIRO",
      status: queryObject.statusCode || queryObject.status
    });

    const result = await bodegaTransactionService.list(filters);

    const items = result.items.map(item => ({
      ...item,
      statusCode: item.status,
      requester: item.requestedBy
    }));

    return NextResponse.json({ ...result, items, data: items });
  } catch (error) {
    console.error("Error en GET /api/v1/bodega/solicitudes-internas:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Parámetros inválidos", details: error.errors }, { status: 400 });
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

    // Usar el servicio especializado que contiene lógica FIFO con precio unitario
    const data = createBodegaInternalRequestSchema.parse({
      ...body,
      requestedBy: session.user.id,
    });

    const created = await bodegaInternalRequestService.create(data, session.user.id);

    await AuditLogger.logAction(request, session.user.id, {
      action: "CREATE",
      module: "bodega_solicitudes_internas",
      targetId: created.id,
      newData: {
        folio: created.folio,
        warehouseId: data.warehouseId,
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

    if (error instanceof BodegaTransactionError || error instanceof BodegaBusinessError) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }

    return NextResponse.json({ error: "Error al crear solicitud interna" }, { status: 500 });
  }
}
