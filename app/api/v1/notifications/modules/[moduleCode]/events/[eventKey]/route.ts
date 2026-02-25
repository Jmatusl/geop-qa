/**
 * PATCH /api/v1/notifications/modules/[moduleCode]/events/[eventKey]
 * 
 * Actualiza el estado (habilitado/deshabilitado) de una notificación específica
 */

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { z } from "zod";

const updateNotificationSchema = z.object({
  isEnabled: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ moduleCode: string; eventKey: string }> }
) {
  try {
    // Verificar sesión
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { moduleCode, eventKey } = await params;
    const body = await request.json();

    // Validar payload
    const validation = updateNotificationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { isEnabled } = validation.data;

    // Verificar que el módulo existe
    const module = await prisma.module.findUnique({
      where: { code: moduleCode },
    });

    if (!module) {
      return NextResponse.json(
        { error: "Módulo no encontrado" },
        { status: 404 }
      );
    }

    // Obtener el estado previo para auditoría
    const previousSetting = await prisma.moduleNotificationSetting.findUnique({
      where: {
        moduleId_eventKey: {
          moduleId: module.id,
          eventKey,
        },
      },
    });

    if (!previousSetting) {
      return NextResponse.json(
        { error: "Configuración de notificación no encontrada" },
        { status: 404 }
      );
    }

    // Actualizar la notificación
    const updated = await prisma.moduleNotificationSetting.update({
      where: {
        moduleId_eventKey: {
          moduleId: module.id,
          eventKey,
        },
      },
      data: { isEnabled },
    });

    // Registrar auditoría
    await AuditLogger.log({
      request,
      userId: session.user.id,
      eventType: "UPDATE",
      module: "NOTIFICATIONS",
      metadata: {
        moduleCode,
        eventKey,
        eventName: updated.eventName,
        previousState: previousSetting.isEnabled,
        newState: isEnabled,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error actualizando notificación:", error);
    return NextResponse.json(
      { error: error.message || "Error al actualizar notificación" },
      { status: 500 }
    );
  }
}
