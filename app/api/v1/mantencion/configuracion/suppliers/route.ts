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
          OR: [
            { rut: { contains: search, mode: "insensitive" as const } },
            { legalName: { contains: search, mode: "insensitive" as const } },
            { fantasyName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    if (all) {
      const data = await prisma.mntSupplier.findMany({
        where,
        orderBy: { legalName: "asc" },
      });
      return NextResponse.json(data);
    }

    const [total, data] = await Promise.all([
      prisma.mntSupplier.count({ where }),
      prisma.mntSupplier.findMany({
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
    console.error("GET mntSupplier error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { rut, businessLine, legalName, fantasyName, contactName, phone, contactEmail, address, isActive } = body;

    const data = await prisma.mntSupplier.create({
      data: {
        rut,
        businessLine,
        legalName: legalName || null,
        fantasyName: fantasyName || null,
        contactName: contactName || null,
        phone: phone || null,
        contactEmail: contactEmail || null,
        address: address || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("POST mntSupplier error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "El RUT ya se encuentra registrado." }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
