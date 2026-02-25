import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { actualizarRequerimientoSchema } from "@/lib/validations/actividades";

type Params = { params: Promise<{ id: string }> };

const INCLUDE_DETAIL = {
  activityType: { select: { id: true, name: true, code: true } },
  priority: { select: { id: true, name: true, colorHex: true } },
  status: { select: { id: true, name: true, code: true, colorHex: true } },
  location: { select: { id: true, name: true } },
  applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
  responsible: { select: { id: true, firstName: true, lastName: true, email: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  activities: {
    include: {
      activityType: { select: { name: true } },
      responsible: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  comments: {
    include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  attachments: {
    include: { uploadedBy: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  timeline: {
    include: {
      changedBy: { select: { firstName: true, lastName: true } },
      prevStatus: { select: { name: true, colorHex: true } },
      newStatus: { select: { name: true, colorHex: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  _count: { select: { activities: true, attachments: true, comments: true } },
};

// GET /api/v1/actividades/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const req = await prisma.actRequirement.findUnique({
      where: { id },
      include: INCLUDE_DETAIL,
    });
    if (!req) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(req);
  } catch (error) {
    console.error("[ACT] Error obteniendo detalle:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PATCH /api/v1/actividades/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = actualizarRequerimientoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { estimatedDate, locationId, applicantUserId, responsibleUserId, ...rest } = parsed.data;

    const updated = await prisma.actRequirement.update({
      where: { id },
      data: {
        ...rest,
        estimatedDate: estimatedDate ? new Date(estimatedDate) : undefined,
        locationId: locationId === "" ? null : locationId,
        applicantUserId: applicantUserId === "" ? null : applicantUserId,
        responsibleUserId: responsibleUserId === "" ? null : responsibleUserId,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[ACT] Error actualizando requerimiento:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
