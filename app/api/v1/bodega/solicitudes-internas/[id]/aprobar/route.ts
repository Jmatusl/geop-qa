import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { bodegaApproveRequestSchema } from "@/lib/validations/bodega-workflow";
import { BodegaBusinessError, bodegaInternalRequestService } from "@/lib/services/bodega/internal-request-service";
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

    const canApprove = await modulePermissionService.userHasPermission(session.user.id, "bodega", "aprueba_solicitudes");

    if (!canApprove) {
      return NextResponse.json({ error: "No autorizado para aprobar solicitudes" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = bodegaApproveRequestSchema.parse(body ?? {});

    await bodegaInternalRequestService.approve(id, data, session.user.id);

    await AuditLogger.logAction(request, session.user.id, {
      action: "UPDATE",
      module: "bodega_solicitudes_internas",
      targetId: id,
      newData: {
        action: "APROBAR",
        observations: data.observations,
      },
    });

    revalidatePath("/bodega/solicitudes-internas");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en POST /api/v1/bodega/solicitudes-internas/[id]/aprobar:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 });
    }

    if (error instanceof BodegaBusinessError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Error al aprobar solicitud interna" }, { status: 500 });
  }
}
