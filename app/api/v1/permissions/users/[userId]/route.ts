/**
 * GET /api/v1/permissions/users/[userId]
 * 
 * Obtiene todos los permisos activos de un usuario organizados por módulo
 */

import { NextResponse } from "next/server";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { verifySession } from "@/lib/auth/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verificar sesión
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { userId } = await params;

    // Obtener todos los permisos del usuario
    const userPermissions = await modulePermissionService.getAllUserPermissions(userId);

    // Convertir Record a array de objetos
    const result = Object.entries(userPermissions).map(([moduleCode, permissionCodes]) => ({
      moduleCode,
      permissionCodes,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error obteniendo permisos de usuario:", error);
    return NextResponse.json(
      { error: "Error al obtener permisos del usuario" },
      { status: 500 }
    );
  }
}
