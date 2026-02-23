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
          OR: [{ name: { contains: search, mode: "insensitive" as const } }, { description: { contains: search, mode: "insensitive" as const } }],
        }
      : {};

    if (all) {
      const data = await prisma.mntProductionArea.findMany({
        where,
        orderBy: { name: "asc" },
      });
      return NextResponse.json(data);
    }

    const [total, data] = await Promise.all([
      prisma.mntProductionArea.count({ where }),
      prisma.mntProductionArea.findMany({
        where,
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
    console.error("GET mntProductionArea error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { name, description, isActive } = body;

    const exists = await prisma.mntProductionArea.findUnique({ where: { name } });
    if (exists) {
      return NextResponse.json({ error: "El nombre ya está en uso" }, { status: 400 });
    }

    const data = await prisma.mntProductionArea.create({
      data: {
        name,
        description,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("POST mntProductionArea error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
