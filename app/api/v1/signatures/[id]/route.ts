import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { z } from "zod";

const updateSignatureSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").optional(),
  data: z.string().min(10, "La firma está vacía").optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  userId: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const signature = await prisma.signature.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!signature) {
      return NextResponse.json({ error: "Firma no encontrada" }, { status: 404 });
    }

    return NextResponse.json(signature);
  } catch (error) {
    console.error("Error fetching signature:", error);
    return NextResponse.json({ error: "Error al obtener firma" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateSignatureSchema.parse(body);

    const existing = await prisma.signature.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Firma no encontrada" }, { status: 404 });
    }

    // Logic for "Unico Default" per user
    if (validated.isDefault && (validated.userId || existing.userId)) {
      const targetUserId = validated.userId || existing.userId;
      await prisma.signature.updateMany({
        where: {
          userId: targetUserId!,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const signature = await prisma.signature.update({
      where: { id },
      data: validated,
    });

    await AuditLogger.logAction(request, session.userId, {
      action: "UPDATE",
      module: "Signatures",
      targetId: id,
      oldData: existing,
      newData: validated,
    });

    return NextResponse.json(signature);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error updating signature:", error);
    return NextResponse.json({ error: "Error al actualizar firma" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const existing = await prisma.signature.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Firma no encontrada" }, { status: 404 });
    }

    await prisma.signature.delete({
      where: { id },
    });

    await AuditLogger.logAction(request, session.userId, {
      action: "DELETE",
      module: "Signatures",
      targetId: id,
      oldData: existing,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting signature:", error);
    return NextResponse.json({ error: "Error al eliminar firma" }, { status: 500 });
  }
}
