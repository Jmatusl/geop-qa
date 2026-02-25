import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { crearRequerimientoSchema } from "@/lib/validations/actividades";

/** Incluye relaciones comunes para el listado */
const INCLUDE_LIST = {
  activityType: { select: { id: true, name: true, code: true } },
  priority: { select: { id: true, name: true, colorHex: true } },
  status: { select: { id: true, name: true, code: true, colorHex: true } },
  ship: { select: { id: true, name: true } },
  location: { select: { id: true, name: true } },
  applicant: { select: { id: true, firstName: true, lastName: true } },
  responsible: { select: { id: true, firstName: true, lastName: true } },
  userCheckedBy: { select: { id: true, firstName: true, lastName: true } },
  activities: {
    select: {
      id: true,
      statusActivity: true,
      isChecked: true,
      receptions: {
        select: {
          id: true,
          isAccepted: true,
        },
      },
    },
  },
  emailsSent: {
    select: {
      id: true,
      requirementFolio: true,
      providerName: true,
      recipient: true,
      subject: true,
      sentAt: true,
      sentBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { sentAt: "desc" as const },
  },
  _count: { select: { activities: true, attachments: true, comments: true, emailsSent: true } },
};

// GET /api/v1/actividades
export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") || "";
  const statusCode = searchParams.get("estado");
  const priorityCode = searchParams.get("prioridad");
  const typeCode = searchParams.get("tipo");
  const fechaDesde = searchParams.get("fechaDesde");
  const fechaHasta = searchParams.get("fechaHasta");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") || "25"));

  try {
    const where: any = {};

    if (search) {
      where.OR = [{ title: { contains: search, mode: "insensitive" } }, { folio: isNaN(parseInt(search)) ? undefined : parseInt(search) }].filter(Boolean);
    }

    if (statusCode) where.status = { code: statusCode };
    if (priorityCode) where.priority = { code: priorityCode };
    if (typeCode) where.activityType = { code: typeCode };
    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt.gte = new Date(fechaDesde);
      if (fechaHasta) where.createdAt.lte = new Date(fechaHasta);
    }

    const [total, data] = await Promise.all([
      prisma.actRequirement.count({ where }),
      prisma.actRequirement.findMany({
        where,
        include: INCLUDE_LIST,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({ data, total, page, pageSize });
  } catch (error: any) {
    console.error("[ACT] Error listando requerimientos:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/v1/actividades
export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = crearRequerimientoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const {
      title,
      priorityId,
      description,
      locationId,
      areaId,
      shipId,
      estimatedDate,
      estimatedTime,
      applicantUserId,
      nombreSolicitante,
      responsibleUserId,
      estimatedValue,
      actividades,
    } = parsed.data;
    // `activityTypeId` removed from client schema; read defensively if present
    const activityTypeId = (parsed.data as any).activityTypeId as string | undefined | null;

    // Obtener estado inicial (Pendiente)
    const estadoPendiente = await prisma.actStatusReq.findUnique({ where: { code: "PEN" } });
    if (!estadoPendiente) return NextResponse.json({ error: "Estado inicial no encontrado. Ejecute los seeds." }, { status: 500 });

    const requerimiento = await prisma.$transaction(async (tx) => {
      // If client didn't provide activityTypeId, pick a default active type
      let resolvedActivityTypeId = activityTypeId;
      if (!resolvedActivityTypeId) {
        const defaultType = await tx.actActivityType.findFirst({ where: { isActive: true }, orderBy: { name: "asc" } });
        if (!defaultType) throw new Error("No existe un tipo de actividad activo. Configure uno antes de crear requerimientos.");
        resolvedActivityTypeId = defaultType.id;
      }
      // Crear el requerimiento principal
      const req = await tx.actRequirement.create({
        data: {
          title: title || "",
          masterActivityNameId: parsed.data.masterActivityNameId || null,
          masterActivityNameText: parsed.data.masterActivityNameText || null,
          activityTypeId: resolvedActivityTypeId,
          priorityId,
          statusId: estadoPendiente.id,
          description,
          locationId: locationId || null,
          areaId: areaId || null,
          shipId: shipId || null,
          estimatedDate: estimatedDate ? new Date(estimatedDate) : null,
          estimatedTime: estimatedTime || null,
          applicantUserId: applicantUserId || session.user.id,
          nombreSolicitante: nombreSolicitante || null,
          responsibleUserId: responsibleUserId || null,
          estimatedValue: estimatedValue || 0,
          createdById: session.user.id,
        },
      });

      // Crear actividades embebidas si las hay
      if (actividades && actividades.length > 0) {
        const statusActPendiente = await tx.actStatusAct.findFirst({ where: { code: "PEN" } });

        await tx.actActivity.createMany({
          data: actividades.map((act) => ({
            requirementId: req.id,
            name: act.name,
            activityTypeId: (act as any).activityTypeId || null,
            description: act.description || null,
            location: act.location || null,
            locationId: act.locationId || null,
            startDate: act.startDate ? new Date(act.startDate) : null,
            endDate: act.endDate ? new Date(act.endDate) : null,
            statusActivity: act.statusActivity || "PENDIENTE",
            statusId: act.statusId || statusActPendiente?.id || null,
            responsibleUserId: act.responsibleUserId || null,
            supplierId: act.supplierId || null,
            estimatedValue: act.estimatedValue || 0,
            observations: act.observations || null,
          })),
        });
      }

      // Registro en timeline
      await tx.actTimeline.create({
        data: {
          requirementId: req.id,
          changedById: session.user.id,
          action: "CREATE",
          newStatusId: estadoPendiente.id,
          comment: "Requerimiento creado",
        },
      });

      return req;
    });

    const folioDisplay = `${requerimiento.folioPrefix}-${String(requerimiento.folio).padStart(4, "0")}`;
    return NextResponse.json({ id: requerimiento.id, folio: folioDisplay }, { status: 201 });
  } catch (error: any) {
    console.error("[ACT] Error creando requerimiento:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
