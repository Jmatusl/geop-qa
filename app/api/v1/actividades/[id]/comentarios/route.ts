import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { agregarComentarioSchema } from "@/lib/validations/actividades";

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/actividades/[id]/comentarios
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = agregarComentarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.actComment.create({
        data: {
          requirementId: id,
          userId: session.user.id,
          comment: parsed.data.comment,
        },
      });

      await tx.actTimeline.create({
        data: {
          requirementId: id,
          changedById: session.user.id,
          action: "COMMENT",
          comment: parsed.data.comment.substring(0, 100),
        },
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[ACT] Error agregando comentario:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
