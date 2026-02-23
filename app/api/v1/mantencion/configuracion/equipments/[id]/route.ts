import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;

    const data = await prisma.mntEquipment.findUnique({
      where: { id },
      include: {
        system: true,
        responsibles: true,
      },
    });

    if (!data) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET mntEquipment by ID error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;
    const body = await request.json();
    const {
      name,
      brand,
      model,
      partNumber,
      serialNumber,
      areaId,
      systemId,
      technicalComments,
      prevInstructions,
      estimatedLife,
      commissioningDate,
      imageUrl,
      imageDescription,
      datasheetUrl,
      datasheetName,
      referencePrice,
      responsibleIds,
      installationId,
      isActive,
    } = body;

    // Use transaction to update equipment and its responsibles
    const data = await prisma.$transaction(async (tx) => {
      // 1. Delete existing responsibles for this equipment
      await tx.mntEquipmentResponsible.deleteMany({
        where: { equipmentId: id },
      });

      // 2. Update equipment and create new responsibles
      return await tx.mntEquipment.update({
        where: { id },
        data: {
          name,
          brand,
          model,
          partNumber,
          serialNumber,
          areaId,
          systemId,
          technicalComments,
          prevInstructions,
          estimatedLife,
          commissioningDate: commissioningDate ? new Date(commissioningDate) : null,
          imageUrl,
          imageDescription,
          datasheetUrl,
          datasheetName,
          referencePrice,
          installationId,
          isActive,
          responsibles: {
            create: (responsibleIds || []).map((rid: string) => ({
              responsibleId: rid,
            })),
          },
        },
      });
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT mntEquipment error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await context.params;

    await prisma.mntEquipment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE mntEquipment error:", error);
    return NextResponse.json({ error: "Error al eliminar, posiblemente en uso" }, { status: 500 });
  }
}
