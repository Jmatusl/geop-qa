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
      const data = await prisma.mntActivityLocation.findMany({
        where,
        orderBy: { name: "asc" },
      });
      return NextResponse.json(data);
    }

    const [total, data] = await Promise.all([
      prisma.mntActivityLocation.count({ where }),
      prisma.mntActivityLocation.findMany({
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
    console.error("GET mntActivityLocation error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { name, commune, isEnabled } = body;

    const data = await prisma.mntActivityLocation.create({
      data: {
        name,
        commune,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("POST mntActivityLocation error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
