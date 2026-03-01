import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { AuditLogger } from "@/lib/audit/logger";
import { BodegaMovementError, bodegaStockMovementService } from "@/lib/services/bodega/stock-movement-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const hasPermission = await modulePermissionService.userHasPermission(
      session.user.id,
      "bodega",
      "gestionar_stock",
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Sin permisos para aplicar movimientos" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const observations = typeof body?.observations === "string" ? body.observations : undefined;

    const applied = await bodegaStockMovementService.applyMovement(id, session.user.id, observations);

    await AuditLogger.logAction(request, session.user.id, {
      action: "UPDATE",
      module: "bodega_movimientos",
      targetId: applied.id,
      newData: {
        status: applied.status,
      },
    });

    return NextResponse.json({ success: true, data: applied });
  } catch (error) {
    if (error instanceof BodegaMovementError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Error al aplicar movimiento" }, { status: 500 });
  }
}
