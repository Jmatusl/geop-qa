import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const all = searchParams.get("all") === "true";

    const where = search
      ? {
          name: { contains: search, mode: "insensitive" as const },
        }
      : {};

    if (all) {
      const data = await prisma.mntEquipment.findMany({
        where,
        include: {
          system: true,
          responsibles: true,
        },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(data);
    }

    const [total, data] = await Promise.all([
      prisma.mntEquipment.count({ where }),
      prisma.mntEquipment.findMany({
        where,
        include: {
          system: true,
          responsibles: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET mntEquipment error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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

    const data = await prisma.mntEquipment.create({
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
        isActive: isActive !== undefined ? isActive : true,
        responsibles: {
          create: (responsibleIds || []).map((id: string) => ({
            responsibleId: id,
          })),
        },
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("POST mntEquipment error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
