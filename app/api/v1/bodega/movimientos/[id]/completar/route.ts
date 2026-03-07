import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { AuditLogger } from "@/lib/audit/logger";
import { BodegaMovementError, bodegaStockMovementService } from "@/lib/services/bodega/stock-movement-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/bodega/movimientos/[id]/completar
 * Finaliza la verificación física de un movimiento.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const hasPermission = await modulePermissionService.userHasPermission(session.user.id, "bodega", "retira_items");

    if (!hasPermission) {
      return NextResponse.json({ error: "Sin permisos para completar verificación" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { items, destinationWarehouseId } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Se requiere un array de items con cantidades verificadas" }, { status: 400 });
    }

    const completed = await bodegaStockMovementService.completeMovement(id, session.user.id, items, destinationWarehouseId);

    await AuditLogger.logAction(request, session.user.id, {
      action: "UPDATE",
      module: "bodega_movimientos",
      targetId: completed.id,
      newData: {
        status: "COMPLETADO",
      },
    });

    return NextResponse.json({ success: true, data: completed });
  } catch (error: any) {
    if (error instanceof BodegaMovementError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[POST /api/v1/bodega/movimientos/[id]/completar] Error:", error);
    return NextResponse.json({ error: "Error al completar verificación" }, { status: 500 });
  }
}
