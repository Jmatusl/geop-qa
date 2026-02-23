import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;
    const data = await prisma.mntActivityLocation.findUnique({
      where: { id },
    });

    if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET mntLocation error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;
    const body = await request.json();
    const { name, commune, isEnabled } = body;

    const data = await prisma.mntActivityLocation.update({
      where: { id },
      data: {
        name,
        commune,
        isEnabled,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT mntActivityLocation error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;

    await prisma.mntActivityLocation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE mntActivityLocation error:", error);
    return NextResponse.json({ error: "Error al eliminar, posiblemente en uso" }, { status: 500 });
  }
}
