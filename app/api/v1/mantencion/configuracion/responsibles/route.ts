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
      const data = await prisma.mntTechnicalResponsible.findMany({
        where,
        include: { area: true, user: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(data);
    }

    const [total, data] = await Promise.all([
      prisma.mntTechnicalResponsible.count({ where }),
      prisma.mntTechnicalResponsible.findMany({
        where,
        include: { area: true, user: true },
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
    console.error("GET mntTechnicalResponsible error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { userId, name, areaId, isActive } = body;

    const data = await prisma.mntTechnicalResponsible.create({
      data: {
        userId,
        name,
        areaId,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("POST mntTechnicalResponsible error:", error);
    return NextResponse.json({ error: "Error interno del servidor (¿usuario ya existe?)" }, { status: 500 });
  }
}
