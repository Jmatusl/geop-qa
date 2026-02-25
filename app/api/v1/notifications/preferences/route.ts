/**
 * API Route: /api/v1/notifications/preferences
 * 
 * Gestión de preferencias personales de notificaciones del usuario actual
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { notificationService } from "@/lib/services/notifications/notification-service";
import { z } from "zod";
import { AuditLogger } from "@/lib/audit/logger";

/**
 * GET /api/v1/notifications/preferences
 * 
 * Obtiene la configuración de notificaciones del usuario actual filtrada por sus permisos
 */
export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const config = await notificationService.getUserNotificationConfig(session.user.id);

    return NextResponse.json(config);
  } catch (error: any) {
    console.error("[API] Error obteniendo preferencias de notificaciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * Schema de validación para actualizar preferencia
 */
const updatePreferenceSchema = z.object({
  moduleCode: z.string().min(1),
  eventKey: z.string().min(1),
  isOptedOut: z.boolean(),
});

/**
 * PATCH /api/v1/notifications/preferences
 * 
 * Actualiza la preferencia de opt-out de una notificación específica
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Validar body
    const body = await req.json();
    const validation = updatePreferenceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { moduleCode, eventKey, isOptedOut } = validation.data;

    // Actualizar preferencia
    await notificationService.setUserNotificationPreference(
      session.user.id,
      moduleCode,
      eventKey,
      isOptedOut
    );

    // Auditoría
    await AuditLogger.log({
      request: req,
      userId: session.user.id,
      eventType: "UPDATE",
      module: "notifications",
      metadata: {
        action: "update_personal_preference",
        moduleCode,
        eventKey,
        isOptedOut,
      },
    });

    return NextResponse.json({
      success: true,
      message: isOptedOut ? "Notificación desactivada" : "Notificación activada",
    });
  } catch (error: any) {
    console.error("[API] Error actualizando preferencia de notificación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
