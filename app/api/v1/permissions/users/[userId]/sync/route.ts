/**
 * POST /api/v1/permissions/users/[userId]/sync
 * 
 * Sincroniza los permisos de un usuario para un módulo específico
 */

import { NextResponse, type NextRequest } from "next/server";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { z } from "zod";

const syncPermissionsSchema = z.object({
  moduleCode: z.string().min(1, "Código de módulo requerido"),
  permissionCodes: z.array(z.string()),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verificar sesión
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { userId } = await params;
    const body = await request.json();

    // Validar payload
    const validation = syncPermissionsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { moduleCode, permissionCodes } = validation.data;

    // Obtener permisos previos para auditoría
    const previousPermissions = await modulePermissionService.getUserPermissions(userId, moduleCode);

    // Sincronizar permisos
    await modulePermissionService.syncPermissions(
      userId,
      moduleCode,
      permissionCodes,
      session.user.id
    );

    // Registrar auditoría
    await AuditLogger.log({
      request,
      userId: session.user.id,
      eventType: "UPDATE",
      module: "PERMISSIONS",
      metadata: {
        targetUserId: userId,
        moduleCode,
        previousPermissions,
        newPermissions: permissionCodes,
        added: permissionCodes.filter(p => !previousPermissions.includes(p)),
        removed: previousPermissions.filter(p => !permissionCodes.includes(p)),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error sincronizando permisos:", error);
    return NextResponse.json(
      { error: error.message || "Error al sincronizar permisos" },
      { status: 500 }
    );
  }
}
