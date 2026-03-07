import { NextRequest, NextResponse } from "next/server";

import { verifySession } from "@/lib/auth/session";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { bodegaQuadratureImportService } from "@/lib/services/bodega/quadrature-import-service";

export async function POST(_request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  const hasPermission = await modulePermissionService.userHasPermission(
    session.user.id,
    "bodega",
    "administrador_bodega"
  );

  if (!hasPermission) {
    return NextResponse.json({ success: false, error: "Sin permisos para limpiar tablas" }, { status: 403 });
  }

  await bodegaQuadratureImportService.cleanAllBodegaData();

  return NextResponse.json({ success: true, message: "Tablas de bodega limpiadas correctamente" });
}
