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

    const hasPermission = await modulePermissionService.userHasPermission(session.user.id, "bodega", "retira_items");

    if (!hasPermission) {
      return NextResponse.json({ error: "Sin permisos para aprobar movimientos" }, { status: 403 });
    }

    const { id } = await params;
    const approved = await bodegaStockMovementService.approveMovement(id, session.user.id);

    await AuditLogger.logAction(request, session.user.id, {
      action: "UPDATE",
      module: "bodega_movimientos",
      targetId: approved.id,
      newData: {
        status: approved.status,
      },
    });

    return NextResponse.json({ success: true, data: approved });
  } catch (error) {
    if (error instanceof BodegaMovementError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Error al aprobar movimiento" }, { status: 500 });
  }
}
