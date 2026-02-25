import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { cambiarEstadoSchema } from "@/lib/validations/actividades";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/v1/actividades/[id]/estado
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = cambiarEstadoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { statusId, comment, responsibleUserId } = parsed.data;

    // Obtener estado actual del requerimiento
    const requerimiento = await prisma.actRequirement.findUnique({
      where: { id },
      select: { statusId: true, responsibleUserId: true },
    });
    if (!requerimiento) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.actRequirement.update({
        where: { id },
        data: {
          statusId,
          responsibleUserId: responsibleUserId || requerimiento.responsibleUserId,
        },
      });

      await tx.actTimeline.create({
        data: {
          requirementId: id,
          changedById: session.user.id,
          action: "STATUS_CHANGE",
          prevStatusId: requerimiento.statusId,
          newStatusId: statusId,
          comment: comment || null,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ACT] Error cambiando estado:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
