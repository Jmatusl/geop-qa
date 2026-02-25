"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { crearRequerimientoSchema, masterActivitySchema, solicitanteSchema } from "@/lib/validations/actividades";

/**
 * Server Action: Crear un nuevo requerimiento de actividad.
 */
export async function crearRequerimiento(data: unknown) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const parsed = crearRequerimientoSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos", details: parsed.error.flatten() };
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
  // `activityTypeId` comes from legacy clients sometimes; read defensively
  const activityTypeId = (parsed.data as any).activityTypeId as string | undefined | null;
  const adjuntos = (parsed.data as any).adjuntos as Array<{ storagePath: string; publicUrl: string; fileName: string; fileSize: number; mimeType: string }> | undefined;

  try {
    // Obtener estado inicial Pendiente
    const estadoPendiente = await prisma.actStatusReq.findUnique({ where: { code: "PEN" } });
    if (!estadoPendiente) return { success: false, error: "Estado inicial no encontrado. Ejecute el seed." };

    const requerimiento = await prisma.$transaction(async (tx) => {
      // Ensure we have an activityTypeId: if none provided, pick a sensible default
      let resolvedActivityTypeId = activityTypeId;
      if (!resolvedActivityTypeId) {
        const defaultType = await tx.actActivityType.findFirst({ where: { isActive: true }, orderBy: { name: "asc" } });
        if (!defaultType) throw new Error("No existe un tipo de actividad activo. Configure uno antes de crear requerimientos.");
        resolvedActivityTypeId = defaultType.id;
      }
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

      if (actividades && actividades.length > 0) {
        // Find default status for activities if exists
        const statusActPendiente = await tx.actStatusAct.findFirst({ where: { code: "PEN" } });

        for (const act of actividades) {
          await tx.actActivity.create({
            data: {
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
            },
          });
        }
      }

      // Guardar adjuntos (si se proporcionan)
      if (adjuntos && adjuntos.length > 0) {
        await tx.actAttachment.createMany({
          data: adjuntos.map(adj => ({
            requirementId: req.id,
            storagePath: adj.storagePath,
            publicUrl: adj.publicUrl,
            fileName: adj.fileName,
            fileSize: adj.fileSize,
            mimeType: adj.mimeType,
            uploadedById: session.user.id,
          })),
        });
      }

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

    revalidatePath("/actividades/listado");

    const folioDisplay = `${requerimiento.folioPrefix}-${String(requerimiento.folio).padStart(4, "0")}`;
    return { success: true, id: requerimiento.id, folio: folioDisplay };
  } catch (error: any) {
    console.error("[ACT] Error creando requerimiento:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Server Action: Crear una nueva actividad maestra (catálogo).
 */
export async function crearMasterActivity(data: unknown) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const parsed = masterActivitySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos", details: parsed.error.flatten() };
  }

  const { name, description, defaultAreaId, defaultApplicantUserId, defaultDescription, isActive } = parsed.data;

  try {
    const master = await prisma.actMasterActivityName.create({
      data: {
        name,
        description: description || null,
        defaultAreaId: defaultAreaId || null,
        defaultApplicantUserId: defaultApplicantUserId || null,
        defaultDescription: defaultDescription || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return { success: true, id: master.id, name: master.name };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Ya existe una actividad con este nombre en el maestro." };
    }
    console.error("[ACT] Error creando actividad maestra:", error);
    return { success: false, error: "Error interno al guardar en el maestro" };
  }
}

/**
 * Server Action: Crear un usuario solicitante básico on-the-fly.
 */
export async function crearSolicitanteUser(data: unknown) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const parsed = solicitanteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos", details: parsed.error.flatten() };
  }

  const { firstName, lastName, email } = parsed.data;

  try {
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        isActive: true,
      },
    });

    return {
      success: true,
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Ya existe un usuario con este correo (email)." };
    }
    console.error("[ACT] Error creando usuario solicitante:", error);
    return { success: false, error: "Error interno al guardar usuario" };
  }
}
