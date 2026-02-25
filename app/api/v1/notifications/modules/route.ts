/**
 * GET /api/v1/notifications/modules
 * 
 * Obtiene todos los módulos activos con sus configuraciones de notificaciones
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET() {
  try {
    // Verificar sesión
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener módulos activos con sus notificaciones ordenadas
    const modules = await prisma.module.findMany({
      where: { isActive: true },
      include: {
        notificationSettings: {
          orderBy: { eventKey: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json(modules);
  } catch (error: any) {
    console.error("Error obteniendo módulos con notificaciones:", error);
    return NextResponse.json(
      { error: "Error al obtener configuraciones" },
      { status: 500 }
    );
  }
}
