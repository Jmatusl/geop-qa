import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifySession } from "@/lib/auth/session";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { bodegaCostCenterService } from "@/lib/services/bodega/cost-center-service";

const bodySchema = z.object({
  code: z.string().min(1, "El código es requerido").max(30),
  name: z.string().min(1, "El nombre es requerido").max(120),
  description: z.string().max(300).optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  const search = request.nextUrl.searchParams.get("search") ?? "";
  const activeParam = request.nextUrl.searchParams.get("active");
  const activeOnly = activeParam === "true" ? true : activeParam === "false" ? false : undefined;

  const data = await bodegaCostCenterService.list(search, activeOnly);
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  const allowed = await modulePermissionService.userHasPermission(session.user.id, "bodega", "gestionar_stock");
  if (!allowed) {
    return NextResponse.json({ success: false, error: "Sin permisos para gestionar maestros" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message || "Datos inválidos" }, { status: 400 });
  }

  try {
    const created = await bodegaCostCenterService.create(parsed.data);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible crear el registro";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
