import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;
    const data = await prisma.mntFarmingCenter.findUnique({
      where: { id },
    });

    if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET mntFarmingCenter error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;
    const body = await request.json();
    const { siepCode, name, latitude, longitude, responsibleName, commune, region, ownerCompany, productionAreaId, productionCycle, description, isActive } = body;

    if (siepCode) {
      const existing = await prisma.mntFarmingCenter.findFirst({
        where: { siepCode, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json({ error: "El código SIEP ya está en uso" }, { status: 400 });
      }
    }

    let parsedLat = latitude ? parseFloat(latitude.toString()) : null;
    let parsedLon = longitude ? parseFloat(longitude.toString()) : null;

    if (parsedLat && isNaN(parsedLat)) parsedLat = null;
    if (parsedLon && isNaN(parsedLon)) parsedLon = null;

    const data = await prisma.mntFarmingCenter.update({
      where: { id },
      data: {
        siepCode,
        name,
        responsibleName,
        commune,
        region,
        ownerCompany,
        latitude: parsedLat,
        longitude: parsedLon,
        productionAreaId: productionAreaId || null,
        productionCycle,
        description,
        isActive,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT mntFarmingCenter error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;

    await prisma.mntFarmingCenter.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE mntFarmingCenter error:", error);
    return NextResponse.json({ error: "Error al eliminar, posiblemente en uso" }, { status: 500 });
  }
}
