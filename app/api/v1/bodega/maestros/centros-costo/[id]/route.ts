import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifySession } from "@/lib/auth/session";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";
import { bodegaCostCenterService } from "@/lib/services/bodega/cost-center-service";

const patchSchema = z.object({
  code: z.string().min(1).max(30).optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(300).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const record = await bodegaCostCenterService.findById(id);
  if (!record) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ success: true, data: record });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const allowed = await modulePermissionService.userHasPermission(session.user.id, "bodega", "gestionar_stock");
  if (!allowed) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Datos inválidos" }, { status: 400 });
  }

  try {
    const updated = await bodegaCostCenterService.update(id, parsed.data);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible actualizar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const allowed = await modulePermissionService.userHasPermission(session.user.id, "bodega", "gestionar_stock");
  if (!allowed) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;

  try {
    await bodegaCostCenterService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible eliminar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
