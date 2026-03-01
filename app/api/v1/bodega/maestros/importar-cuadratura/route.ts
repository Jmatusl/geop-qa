import { NextRequest, NextResponse } from "next/server";

import { verifySession } from "@/lib/auth/session";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { bodegaQuadratureImportService } from "@/lib/services/bodega/quadrature-import-service";

export async function POST(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  const hasPermission = await modulePermissionService.userHasPermission(
    session.user.id,
    "bodega",
    "administrar_maestros"
  );

  if (!hasPermission) {
    return NextResponse.json({ success: false, error: "Sin permisos para importar" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "Archivo no proporcionado" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
    return NextResponse.json({ success: false, error: "Formato de archivo inválido" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();

  try {
    const result = await bodegaQuadratureImportService.importFromExcel(new Uint8Array(bytes), session.user.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "No fue posible importar la cuadratura",
      },
      { status: 400 }
    );
  }
}
