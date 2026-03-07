import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { bodegaArticleSchema } from "@/lib/validations/bodega-master";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await prisma.bodegaArticle.findUnique({ where: { id } });

    if (!data) {
      return NextResponse.json({ error: "Artículo no encontrado" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error al obtener artículo" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const hasPermission = await modulePermissionService.userHasPermission(session.user.id, "bodega", "administrador_bodega");
    if (!hasPermission) {
      return NextResponse.json({ error: "Sin permisos para administrar maestros" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = bodegaArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Datos inválidos" }, { status: 400 });
    }

    const data = await prisma.bodegaArticle.update({
      where: { id },
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

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error al actualizar artículo" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const hasPermission = await modulePermissionService.userHasPermission(session.user.id, "bodega", "administrador_bodega");
    if (!hasPermission) {
      return NextResponse.json({ error: "Sin permisos para administrar maestros" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.bodegaArticle.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar artículo" }, { status: 500 });
  }
}
