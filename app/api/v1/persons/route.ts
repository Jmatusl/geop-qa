import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { personSchema } from "@/lib/validations/person";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const isActiveParam = searchParams.get("isActive");

    const where: any = {};

    if (isActiveParam !== null) {
      where.isActive = isActiveParam === "true";
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { rut: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const isAll = searchParams.get("all") === "true";
    const skip = (page - 1) * limit;

    if (isAll) {
      const items = await prisma.person.findMany({
        where,
        orderBy: { lastName: "asc" },
        include: {
          jobPositions: {
            where: { isActive: true },
            take: 1,
            include: { jobPosition: true },
          },
          user: {
            include: {
              userRoles: {
                include: { role: true },
              },
            },
          },
        },
      });
      return NextResponse.json({ data: items });
    }

    const [total, items] = await Promise.all([
      prisma.person.count({ where }),
      prisma.person.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: "asc" },
        include: {
          jobPositions: {
            where: { isActive: true },
            take: 1,
            include: { jobPosition: true },
          },
          user: {
            include: {
              userRoles: {
                include: { role: true },
              },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching persons:", error);
    return NextResponse.json({ error: "Error fetching persons" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = personSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.error.errors }, { status: 400 });
    }

    const { rut, email } = validation.data;

    // Validar unicidad de RUT
    const existingRut = await prisma.person.findUnique({ where: { rut } });
    if (existingRut) {
      return NextResponse.json({ error: "El RUT ya está registrado" }, { status: 400 });
    }

    const person = await prisma.person.create({
      data: {
        ...validation.data,
        // Asegurar formato fecha
        birthDate: validation.data.birthDate ? new Date(validation.data.birthDate) : null,
      },
    });

    // Log
    const session = await verifySession();
    await AuditLogger.logAction(request, session?.userId || null, {
      action: "CREATE",
      module: "Persons",
      targetId: person.id,
      newData: validation.data,
    });

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    console.error("Error creating person:", error);
    return NextResponse.json({ error: "Error creating person" }, { status: 500 });
  }
}
