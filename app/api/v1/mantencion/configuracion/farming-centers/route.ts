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
          OR: [{ name: { contains: search, mode: "insensitive" as const } }, { siepCode: { contains: search, mode: "insensitive" as const } }],
        }
      : {};

    if (all) {
      const data = await prisma.mntFarmingCenter.findMany({
        where,
        include: { productionArea: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(data);
    }

    const [total, data] = await Promise.all([
      prisma.mntFarmingCenter.count({ where }),
      prisma.mntFarmingCenter.findMany({
        where,
        include: { productionArea: true },
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
    console.error("GET mntFarmingCenter error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { siepCode, name, latitude, longitude, responsibleName, commune, region, ownerCompany, productionAreaId, productionCycle, description, isActive } = body;

    const exists = await prisma.mntFarmingCenter.findUnique({ where: { siepCode } });
    if (exists) {
      return NextResponse.json({ error: "El código SIEP ya está en uso" }, { status: 400 });
    }

    let parsedLat = latitude ? parseFloat(latitude) : null;
    let parsedLon = longitude ? parseFloat(longitude) : null;

    if (parsedLat && isNaN(parsedLat)) parsedLat = null;
    if (parsedLon && isNaN(parsedLon)) parsedLon = null;

    const data = await prisma.mntFarmingCenter.create({
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
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("POST mntFarmingCenter error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
