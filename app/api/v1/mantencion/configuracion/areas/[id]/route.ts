import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;
    const data = await prisma.mntArea.findUnique({
      where: { id },
    });

    if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET mntArea error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;
    const body = await request.json();
    const { name, description, signatureId, isActive } = body;

    const data = await prisma.mntArea.update({
      where: { id },
      data: {
        name,
        description,
        signatureId: signatureId || null,
        isActive,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT mntArea error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;

    await prisma.mntArea.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE mntArea error:", error);
    return NextResponse.json({ error: "Error al eliminar, posiblemente en uso" }, { status: 500 });
  }
}
