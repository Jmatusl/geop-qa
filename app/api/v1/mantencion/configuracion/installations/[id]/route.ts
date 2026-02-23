import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;
    const data = await prisma.mntInstallation.findUnique({
      where: { id },
    });

    if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET mntInstallation error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;
    const body = await request.json();
    const { name, folio, internalCode, installationType, latitude, longitude, farmingCenterId, description, observations, isActive } = body;

    let parsedLat = latitude ? parseFloat(latitude.toString()) : null;
    let parsedLon = longitude ? parseFloat(longitude.toString()) : null;

    if (parsedLat && isNaN(parsedLat)) parsedLat = null;
    if (parsedLon && isNaN(parsedLon)) parsedLon = null;

    const data = await prisma.mntInstallation.update({
      where: { id },
      data: {
        name,
        folio,
        internalCode,
        installationType,
        latitude: parsedLat,
        longitude: parsedLon,
        farmingCenterId: farmingCenterId || null,
        description,
        observations,
        isActive,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT mntInstallation error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;

    await prisma.mntInstallation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE mntInstallation error:", error);
    return NextResponse.json({ error: "Error al eliminar, posiblemente en uso" }, { status: 500 });
  }
}
