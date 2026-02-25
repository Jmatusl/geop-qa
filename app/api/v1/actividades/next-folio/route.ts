import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    // Obtener prefijo de configuración del módulo de actividades
    const config = await prisma.appSetting.findUnique({ where: { key: "act_system_rules" } });
    const prefix = (config?.value as any)?.folioPrefix || "REQ";

    // Obtener el mayor folio actual y calcular el siguiente correlativo
    const agg = await prisma.actRequirement.aggregate({ _max: { folio: true } });
    const currentMax = agg._max.folio ?? 0;
    const next = currentMax + 1;
    const folioDisplay = `${prefix}-${String(next).padStart(4, "0")}`;

    return NextResponse.json({ folio: folioDisplay, prefix, next });
  } catch (error: any) {
    console.error("[ACT] Error obteniendo next-folio:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
