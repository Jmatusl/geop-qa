import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { bodegaWarehouseSchema } from "@/lib/validations/bodega-master";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const where = search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.bodegaWarehouse.findMany({
        where,
        orderBy: [{ name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bodegaWarehouse.count({ where }),
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
  } catch {
    return NextResponse.json({ error: "Error al listar bodegas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const hasPermission = await modulePermissionService.userHasPermission(
      session.user.id,
      "bodega",
      "administrador_bodega"
    );
    if (!hasPermission) {
      return NextResponse.json({ error: "Sin permisos para administrar maestros" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bodegaWarehouseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Datos inválidos" }, { status: 400 });
    }

    const data = await prisma.bodegaWarehouse.create({
      data: {
        code: parsed.data.code.trim(),
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        location: parsed.data.location?.trim() || null,
        isActive: parsed.data.isActive ?? true,
      },
    });

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear bodega" }, { status: 500 });
  }
}
