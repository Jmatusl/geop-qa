/**
 * API: Estadísticas de Solicitudes Internas
 * Archivo: app/api/v1/bodega/solicitudes-internas/stats/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { bodegaInternalRequestService } from "@/lib/services/bodega/internal-request-service";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const soloMias = searchParams.get("soloMias") === "true";

    const filters = {
      requestedBy: soloMias ? session.user.id : undefined,
    };

    const stats = await bodegaInternalRequestService.getStats(filters);

    const userRoles = session.user.roles || [];
    const isBodegaAdmin = userRoles.includes("ADMIN") || userRoles.includes("JEFE_BODEGA");

    // Agregar permisos básicos para el widget
    const permissions = {
      esAdministrador: userRoles.includes("ADMIN"),
      puedeAprobar: isBodegaAdmin,
      puedePreparar: isBodegaAdmin || userRoles.includes("BODEGUERO"),
    };

    return NextResponse.json({
      ...stats,
      permisos: permissions,
    });
  } catch (error) {
    console.error("Error en GET /api/v1/bodega/solicitudes-internas/stats:", error);
    return NextResponse.json({ error: "Error al obtener estadísticas" }, { status: 500 });
  }
}
