import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { bodegaArticleSchema } from "@/lib/validations/bodega-master";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const where = search
      ? {
          OR: [{ code: { contains: search, mode: "insensitive" as const } }, { name: { contains: search, mode: "insensitive" as const } }],
        }
      : {};

    const [articles, total] = await Promise.all([
      prisma.bodegaArticle.findMany({
        where: {
          ...where,
          isActive: true,
        },
        include: {
          stocks: {
            select: {
              quantity: true,
              warehouseId: true,
            },
          },
        },
        orderBy: [{ name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bodegaArticle.count({ where: { ...where, isActive: true } }),
    ]);

    const data = articles.map((a) => ({
      ...a,
      stock: a.stocks.reduce((acc, s) => acc + Number(s.quantity), 0),
    }));

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
    return NextResponse.json({ error: "Error al listar artículos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const hasPermission = await modulePermissionService.userHasPermission(session.user.id, "bodega", "administrador_bodega");
    if (!hasPermission) {
      return NextResponse.json({ error: "Sin permisos para administrar maestros" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bodegaArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Datos inválidos" }, { status: 400 });
    }

    const data = await prisma.bodegaArticle.create({
      data: {
        code: parsed.data.code.trim(),
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        partNumber: parsed.data.partNumber?.trim() || null,
        brand: parsed.data.brand?.trim() || null,
        model: parsed.data.model?.trim() || null,
        internalCode: parsed.data.internalCode?.trim() || null,
        articleType: parsed.data.articleType?.trim() || null,
        quality: parsed.data.quality?.trim() || null,
        isCritical: parsed.data.isCritical ?? false,
        unit: parsed.data.unit.trim(),
        minimumStock: parsed.data.minimumStock,
        imagePath: parsed.data.imagePath?.trim() || null,
        technicalFilePath: parsed.data.technicalFilePath?.trim() || null,
        isActive: parsed.data.isActive ?? true,
      },
    });

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear artículo" }, { status: 500 });
  }
}
