import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ moduleCode: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { moduleCode } = await params;
    const permissions = await modulePermissionService.getUserPermissions(session.user.id, moduleCode);

    return NextResponse.json({ data: permissions });
  } catch (error) {
    console.error("Error obteniendo permisos del usuario:", error);
    return NextResponse.json(
      { error: "Error al obtener permisos del usuario" },
      { status: 500 }
    );
  }
}
