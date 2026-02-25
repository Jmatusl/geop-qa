import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

// GET /api/v1/actividades/catalogs
export async function GET(_req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const [activityTypes, priorities, statuses, locations, users] = await Promise.all([
      prisma.actActivityType.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, description: true },
      }),
      prisma.actPriority.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
        select: { id: true, name: true, code: true, colorHex: true },
      }),
      prisma.actStatusReq.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
        select: { id: true, name: true, code: true, colorHex: true },
      }),
      prisma.mntActivityLocation.findMany({
        where: { isEnabled: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, commune: true },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        orderBy: { firstName: "asc" },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
    ]);

    return NextResponse.json({ activityTypes, priorities, statuses, locations, users });
  } catch (error) {
    console.error("[ACT] Error cargando catálogos:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
