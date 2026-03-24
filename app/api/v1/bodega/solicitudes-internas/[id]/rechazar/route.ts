import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { bodegaTransactionService, BodegaTransactionError } from "@/lib/services/bodega/transaction-service";
import { z } from "zod";
import { revalidatePath } from "next/cache";

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
    const canReject = await modulePermissionService.userHasPermission(session.user.id, "bodega", "aprueba_solicitudes");

    if (!canReject) {
      return NextResponse.json({ error: "No tiene permiso 'aprueba_solicitudes' para realizar esta acción" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Sin motivo especificado";

    await bodegaTransactionService.reject(id, session.user.id, reason);

    await AuditLogger.logAction(request, session.user.id, {
      action: "UPDATE",
      module: "bodega_solicitudes_internas",
      targetId: id,
      newData: {
        action: "RECHAZAR",
        reason,
      },
    });

    revalidatePath("/bodega/solicitudes-internas");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en POST /api/v1/bodega/solicitudes-internas/[id]/rechazar:", error);

    if (error instanceof BodegaTransactionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Error al rechazar transacción" }, { status: 500 });
  }
}
