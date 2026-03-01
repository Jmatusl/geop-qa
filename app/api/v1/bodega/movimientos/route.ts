import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { createBodegaMovementSchema } from "@/lib/validations/bodega-movement";
import { AuditLogger } from "@/lib/audit/logger";
import { BodegaMovementError, bodegaStockMovementService } from "@/lib/services/bodega/stock-movement-service";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || "1");
    const pageSize = Number(searchParams.get("pageSize") || "20");
    const search = (searchParams.get("search") || "").trim();
    const movementType = (searchParams.get("movementType") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const warehouseId = (searchParams.get("warehouseId") || "").trim();

    const result = await bodegaStockMovementService.listMovements({
      page,
      pageSize,
      search,
      movementType,
      status,
      warehouseId,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Error al obtener movimientos de bodega" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const canManageStock = await modulePermissionService.userHasPermission(
      session.user.id,
      "bodega",
      "gestionar_stock",
    );

    if (!canManageStock) {
      return NextResponse.json({ error: "Sin permisos para registrar movimientos" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createBodegaMovementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Datos inválidos" }, { status: 400 });
    }

    const created = await bodegaStockMovementService.createMovement(parsed.data, session.user.id);

    await AuditLogger.logAction(request, session.user.id, {
      action: "CREATE",
      module: "bodega_movimientos",
      targetId: created.id,
      newData: {
        movementType: parsed.data.movementType,
        warehouseId: parsed.data.warehouseId,
        articleId: parsed.data.articleId,
        quantity: parsed.data.quantity,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof BodegaMovementError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Error al registrar movimiento de bodega" }, { status: 500 });
  }
}