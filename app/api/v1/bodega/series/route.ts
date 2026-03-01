import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { BodegaMovementError, bodegaStockMovementService } from "@/lib/services/bodega/stock-movement-service";
import { createBodegaSerialNumberSchema } from "@/lib/validations/bodega-lot-series";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { AuditLogger } from "@/lib/audit/logger";

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
    const warehouseId = (searchParams.get("warehouseId") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const articleId = (searchParams.get("articleId") || "").trim();

    const result = await bodegaStockMovementService.listSeries({
      page,
      pageSize,
      search,
      warehouseId,
      status,
      articleId,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Error al obtener números de serie" }, { status: 500 });
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
      return NextResponse.json({ error: "Sin permisos para registrar números de serie" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createBodegaSerialNumberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Datos inválidos" }, { status: 400 });
    }

    const created = await bodegaStockMovementService.createSerialNumber(parsed.data, session.user.id);

    await AuditLogger.logAction(request, session.user.id, {
      action: "CREATE",
      module: "bodega_series",
      targetId: created.id,
      newData: {
        lotId: created.lotId,
        serialNumber: created.serialNumber,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof BodegaMovementError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Error al crear número de serie" }, { status: 500 });
  }
}