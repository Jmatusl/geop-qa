import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;
    const data = await prisma.mntProductionArea.findUnique({
      where: { id },
    });

    if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET mntProductionArea error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;
    const body = await request.json();
    const { name, description, isActive } = body;

    if (name) {
      const existing = await prisma.mntProductionArea.findFirst({
        where: { name, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json({ error: "El nombre ya está en uso" }, { status: 400 });
      }
    }

    const data = await prisma.mntProductionArea.update({
      where: { id },
      data: { name, description, isActive },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT mntProductionArea error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;

    await prisma.mntProductionArea.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE mntProductionArea error:", error);
    return NextResponse.json({ error: "Error al eliminar, posiblemente en uso" }, { status: 500 });
  }
}
