/**
 * GET /api/v1/permissions/modules
 * 
 * Obtiene todos los módulos activos con sus permisos ordenados
 */

import { NextResponse } from "next/server";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { verifySession } from "@/lib/auth/session";

export async function GET() {
  try {
    // Verificar sesión
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener módulos con permisos
    const modules = await modulePermissionService.getModulesWithPermissions();

    return NextResponse.json(modules);
  } catch (error: any) {
    console.error("Error obteniendo módulos:", error);
    return NextResponse.json(
      { error: "Error al obtener módulos" },
      { status: 500 }
    );
  }
}
