import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const updateSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  description: z.string().optional(),
});

const ALLOWED_KEYS = ["BODEGA_GENERAL_CONFIG", "BODEGA_NOTIFICACIONES_CONFIG"];

export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const settings = await prisma.appSetting.findMany({
      where: {
        key: { in: ALLOWED_KEYS },
      },
      select: {
        key: true,
        value: true,
        isActive: true,
      },
    });

    const result: Record<string, unknown> = {};
    for (const key of ALLOWED_KEYS) {
      const setting = settings.find((item) => item.key === key);
      result[key] = setting?.isActive ? setting.value : {};
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error obteniendo configuración de bodega:", error);
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { key, value, description } = parsed.data;
    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json({ error: "Clave no permitida" }, { status: 400 });
    }

    const setting = await prisma.appSetting.upsert({
      where: { key },
      create: {
        key,
        value: value as object,
        description: description || `Configuración ${key}`,
        isActive: true,
        updatedById: session.user.id,
      },
      update: {
        value: value as object,
        description,
        isActive: true,
        updatedById: session.user.id,
      },
    });

    return NextResponse.json({ success: true, setting });
  } catch (error) {
    console.error("Error actualizando configuración de bodega:", error);
    return NextResponse.json({ error: "Error al actualizar configuración" }, { status: 500 });
  }
}
