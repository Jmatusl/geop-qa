import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { AuditLogger } from "@/lib/audit/logger";
import { z } from "zod";

/**
 * Schema de validación para toggle global de notificaciones
 */
const toggleGlobalSchema = z.object({
  emailEnabled: z.boolean(),
});

/**
 * PATCH /api/v1/notifications/modules/[moduleCode]/toggle-global
 * 
 * Activa o desactiva globalmente todas las notificaciones de un módulo.
 * Actualiza el campo emailEnabled del módulo.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ moduleCode: string }> }
) {
  try {
    // Verificar sesión
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Validar que el usuario sea ADMIN
    if (!session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    // Obtener parámetros
    const { moduleCode } = await params;

    // Validar body
    const body = await req.json();
    const validation = toggleGlobalSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { emailEnabled } = validation.data;

    // Verificar que el módulo exista
    const module = await prisma.module.findUnique({
      where: { code: moduleCode },
    });

    if (!module) {
      return NextResponse.json({ error: "Módulo no encontrado" }, { status: 404 });
    }

    // Actualizar el switch global del módulo
    const updatedModule = await prisma.module.update({
      where: { code: moduleCode },
      data: { emailEnabled },
    });

    // Registrar auditoría
    await AuditLogger.log({
      request: req,
      userId: session.user.id,
      eventType: "UPDATE",
      module: "notifications",
      metadata: {
        action: "toggle_global_email",
        moduleCode,
        moduleName: module.name,
        emailEnabled,
        previousValue: module.emailEnabled,
      },
    });

    return NextResponse.json({
      success: true,
      module: {
        id: updatedModule.id,
        code: updatedModule.code,
        name: updatedModule.name,
        emailEnabled: updatedModule.emailEnabled,
      },
    });
  } catch (error: any) {
    console.error("[API] Error toggling global notification:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}
