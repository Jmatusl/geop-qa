"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { cambiarEstadoSchema, agregarComentarioSchema, asignarResponsableSchema, actualizarRequerimientoSchema } from "@/lib/validations/actividades";

/**
 * Cambiar el estado de un requerimiento.
 */
export async function cambiarEstadoRequerimiento(id: string, data: unknown) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const parsed = cambiarEstadoSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const [actual, targetStatus, { getMyActPermissions }] = await Promise.all([
      prisma.actRequirement.findUnique({ where: { id }, select: { statusId: true } }),
      prisma.actStatusReq.findUnique({ where: { id: parsed.data.statusId }, select: { code: true } }),
      import("../configuracion/sistema/actions"),
    ]);

    if (!actual || !targetStatus) return { success: false, error: "Requerimiento o estado no encontrado" };

    // Verificar permisos
    const permissions = await getMyActPermissions();
    if (targetStatus.code === "CMP" && !permissions.recepciona) {
      return { success: false, error: "No tiene permiso para recepcionar requerimientos" };
    }
    if (targetStatus.code !== "CMP" && !permissions.autoriza) {
      return { success: false, error: "No tiene permiso para autorizar cambios de estado" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.actRequirement.update({
        where: { id },
        data: {
          statusId: parsed.data.statusId,
          responsibleUserId: parsed.data.responsibleUserId || undefined,
        },
      });
      await tx.actTimeline.create({
        data: {
          requirementId: id,
          changedById: session.user.id,
          action: "STATUS_CHANGE",
          prevStatusId: actual.statusId,
          newStatusId: parsed.data.statusId,
          comment: parsed.data.comment || null,
        },
      });
    });

    revalidatePath(`/actividades/${id}`);
    revalidatePath("/actividades/listado");
    return { success: true };
  } catch (e: any) {
    console.error("[ACT] Error cambiando estado:", e);
    return { success: false, error: "Error interno" };
  }
}

/**
 * Agregar un comentario a un requerimiento.
 */
export async function agregarComentario(id: string, data: unknown) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const parsed = agregarComentarioSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Comentario inválido" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.actComment.create({
        data: { requirementId: id, userId: session.user.id, comment: parsed.data.comment },
      });
      await tx.actTimeline.create({
        data: {
          requirementId: id,
          changedById: session.user.id,
          action: "COMMENT",
          comment: parsed.data.comment.substring(0, 150),
        },
      });
    });

    revalidatePath(`/actividades/${id}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Error interno" };
  }
}

/**
 * Asignar responsable a un requerimiento.
 */
export async function asignarResponsable(id: string, data: unknown) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const parsed = asignarResponsableSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.actRequirement.update({
        where: { id },
        data: { responsibleUserId: parsed.data.responsibleUserId },
      });
      await tx.actTimeline.create({
        data: {
          requirementId: id,
          changedById: session.user.id,
          action: "ASSIGN",
          comment: parsed.data.comment || "Responsable asignado",
        },
      });
    });

    revalidatePath(`/actividades/${id}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Error interno" };
  }
}

/**
 * Marcar/Desmarcar una actividad como chequeada.
 */
export async function toggleActivityCheck(activityId: string, isChecked: boolean) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  // Verificar permiso
  const { getMyActPermissions } = await import("../configuracion/sistema/actions");
  const permissions = await getMyActPermissions();
  if (!permissions.chequea) {
    return { success: false, error: "No tiene permiso para chequear actividades" };
  }

  try {
    const activity = await prisma.actActivity.update({
      where: { id: activityId },
      data: {
        isChecked,
        checkedAt: isChecked ? new Date() : null,
        checkedById: isChecked ? session.user.id : null,
      },
      select: { requirementId: true, name: true },
    });

    await prisma.actTimeline.create({
      data: {
        requirementId: activity.requirementId,
        changedById: session.user.id,
        action: "STATUS_CHANGE",
        comment: `${isChecked ? "Chequeada" : "Desmarcada"}: ${activity.name}`,
      },
    });

    revalidatePath(`/actividades/${activity.requirementId}`);
    return { success: true };
  } catch (error) {
    console.error("[ACT] Error al chequear actividad:", error);
    return { success: false, error: "Error al actualizar actividad" };
  }
}

/**
 * Solicitar revisión de un requerimiento.
 */
export async function solicitarRevision(id: string, observations: string) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const { getMyActPermissions } = await import("../configuracion/sistema/actions");
  const perms = await getMyActPermissions();
  if (!perms.autoriza) return { success: false, error: "No tiene permiso para solicitar revisión" };

  try {
    const status = await prisma.actStatusReq.findFirst({ where: { OR: [{ code: "ENV" }, { name: { contains: "Revisión", mode: "insensitive" } }] } });

    await prisma.$transaction([
      prisma.actRequirement.update({
        where: { id },
        data: {
          userCheckRequerido: true,
          userCheckObservaciones: observations,
          statusId: status?.id,
        },
      }),
      prisma.actTimeline.create({
        data: {
          requirementId: id,
          changedById: session.user.id,
          action: "STATUS_CHANGE",
          newStatusId: status?.id,
          comment: `Solicitud de revisión: ${observations.substring(0, 100)}`,
        },
      }),
    ]);

    revalidatePath("/actividades/listado");
    revalidatePath(`/actividades/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al solicitar revisión" };
  }
}

/**
 * Aprobar la revisión de un requerimiento (Paso intermedio).
 */
export async function aprobarRevision(id: string, respuesta?: string) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const { getMyActPermissions } = await import("../configuracion/sistema/actions");
  const perms = await getMyActPermissions();
  if (!perms.revisa && !perms.chequea && !perms.autoriza) {
    return { success: false, error: "No tiene permiso para aprobar revisiones" };
  }

  try {
    const status = await prisma.actStatusReq.findFirst({ where: { OR: [{ code: "REV" }, { name: { contains: "Revisado", mode: "insensitive" } }] } });

    const timelineComment = respuesta 
      ? `Revisión aprobada (Marcado como Revisado): ${respuesta}`
      : "Revisión aprobada (Marcado como Revisado)";

    await prisma.$transaction([
      prisma.actRequirement.update({
        where: { id },
        data: {
          userCheckRequeridoAprobado: true,
          userCheckedById: session.user.id,
          userCheckedAt: new Date(),
          statusId: status?.id,
        },
      }),
      prisma.actTimeline.create({
        data: {
          requirementId: id,
          changedById: session.user.id,
          action: "STATUS_CHANGE",
          newStatusId: status?.id,
          comment: timelineComment,
        },
      }),
    ]);

    revalidatePath("/actividades/listado");
    revalidatePath(`/actividades/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al aprobar revisión" };
  }
}

/**
 * Aprobación final de un requerimiento.
 */
export async function aprobarRequerimiento(id: string) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const { getMyActPermissions } = await import("../configuracion/sistema/actions");
  const perms = await getMyActPermissions();
  if (!perms.autoriza) return { success: false, error: "No tiene permiso para aprobar requerimientos" };

  try {
    const status = await prisma.actStatusReq.findFirst({ where: { OR: [{ code: "APR" }, { code: "CMP" }, { name: { contains: "Aprobado", mode: "insensitive" } }] } });

    await prisma.$transaction([
      prisma.actRequirement.update({
        where: { id },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedById: session.user.id,
          statusId: status?.id,
        },
      }),
      prisma.actTimeline.create({
        data: {
          requirementId: id,
          changedById: session.user.id,
          action: "STATUS_CHANGE",
          newStatusId: status?.id,
          comment: "Requerimiento aprobado final",
        },
      }),
    ]);

    revalidatePath("/actividades/listado");
    revalidatePath(`/actividades/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al aprobar requerimiento" };
  }
}

/**
 * Acciones Masivas (Bulk Actions)
 */
export async function bulkSolicitarRevision(ids: string[]) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const { getMyActPermissions } = await import("../configuracion/sistema/actions");
  const perms = await getMyActPermissions();
  if (!perms.autoriza) return { success: false, error: "No tiene permiso" };

  try {
    const status = await prisma.actStatusReq.findFirst({ where: { code: "ENV" } });
    await prisma.actRequirement.updateMany({
      where: { id: { in: ids }, isApproved: false },
      data: { userCheckRequerido: true, statusId: status?.id },
    });
    revalidatePath("/actividades/listado");
    return { success: true };
  } catch {
    return { success: false, error: "Error bulk" };
  }
}

export async function bulkAprobarRevision(ids: string[]) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const { getMyActPermissions } = await import("../configuracion/sistema/actions");
  const perms = await getMyActPermissions();
  if (!perms.revisa && !perms.chequea && !perms.autoriza) {
    return { success: false, error: "No tiene permiso" };
  }

  try {
    const status = await prisma.actStatusReq.findFirst({ where: { code: "REV" } });
    await prisma.actRequirement.updateMany({
      where: { id: { in: ids }, userCheckRequerido: true },
      data: { userCheckRequeridoAprobado: true, userCheckedAt: new Date(), statusId: status?.id },
    });
    revalidatePath("/actividades/listado");
    return { success: true };
  } catch {
    return { success: false, error: "Error bulk" };
  }
}

export async function bulkAprobarFinal(ids: string[]) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const { getMyActPermissions } = await import("../configuracion/sistema/actions");
  const perms = await getMyActPermissions();
  if (!perms.autoriza) return { success: false, error: "No tiene permiso" };

  try {
    const status = (await prisma.actStatusReq.findFirst({ where: { code: "APR" } })) || (await prisma.actStatusReq.findFirst({ where: { code: "CMP" } }));
    await prisma.actRequirement.updateMany({
      where: { id: { in: ids }, isApproved: false },
      data: { isApproved: true, approvedAt: new Date(), approvedById: session.user.id, statusId: status?.id },
    });
    revalidatePath("/actividades/listado");
    return { success: true };
  } catch {
    return { success: false, error: "Error bulk" };
  }
}

/**
 * Actualizar un requerimiento completo.
 */
export async function actualizarRequerimiento(id: string, data: unknown) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const parsed = actualizarRequerimientoSchema.safeParse(data);
  if (!parsed.success) {
    console.error("[ACT] Errores de validación:", parsed.error);
    return { success: false, error: "Datos del formulario inválidos" };
  }

  const { title, description, priorityId, locationId, areaId, shipId, estimatedDate, estimatedTime, applicantUserId, actividades = [], estimatedValue, adjuntos = [] } = parsed.data;

  // Extraer adjuntos de actividades si vienen en el payload (mapeados por índice)
  const activityAttachments = (parsed.data as any).activityAttachments as { [activityIndex: string]: Array<{ storagePath: string; publicUrl: string; fileName: string; fileSize: number; mimeType: string }> } | undefined;

  try {
    const existing = await prisma.actRequirement.findUnique({
      where: { id },
      include: { activities: true }
    });

    if (!existing) return { success: false, error: "Requerimiento no encontrado" };
    if (existing.isApproved) return { success: false, error: "No se puede editar un requerimiento ya aprobado" };
    
    // SEGURIDAD: No permitir edición si hay solicitud de revisión activa
    if (existing.userCheckRequerido) {
      return { success: false, error: "No se puede editar un requerimiento con solicitud de revisión activa" };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Actualizar requerimiento
      await tx.actRequirement.update({
        where: { id },
        data: {
          title: title || undefined,
          description: description || undefined,
          priorityId,
          locationId: locationId || null,
          areaId: areaId || null,
          shipId: shipId || null,
          estimatedDate: estimatedDate ? new Date(estimatedDate) : null,
          estimatedTime: estimatedTime || null,
          applicantUserId: applicantUserId || null,
          estimatedValue: estimatedValue || 0,
        },
      });

      // 2. Gestionar actividades (Sincronización) - solo si se proporcionan
      if (actividades && actividades.length >= 0) {
        const incomingIds = actividades.map(a => a.id).filter(Boolean) as string[];
        const toDelete = existing.activities.filter(a => !incomingIds.includes(a.id)).map(a => a.id);

        if (toDelete.length > 0) {
          await tx.actActivity.deleteMany({ where: { id: { in: toDelete } } });
        }

        for (let index = 0; index < actividades.length; index++) {
          const act = actividades[index];
          
          if (act.id) {
              await tx.actActivity.update({
                  where: { id: act.id },
                  data: {
                      name: act.name,
                      description: act.description || "",
                      locationId: act.locationId || null,
                      supplierId: act.supplierId || null,
                      startDate: act.startDate ? new Date(act.startDate) : null,
                      endDate: act.endDate ? new Date(act.endDate) : null,
                      statusActivity: act.statusActivity as any,
                      estimatedValue: act.estimatedValue || 0,
                  }
              });

              // Guardar adjuntos nuevos de esta actividad usando el índice
              if (activityAttachments && activityAttachments[String(index)] && activityAttachments[String(index)].length > 0) {
                await tx.actActivityAttachment.createMany({
                  data: activityAttachments[String(index)].map(att => ({
                    activityId: act.id!,
                    storagePath: att.storagePath,
                    publicUrl: att.publicUrl,
                    fileName: att.fileName,
                    fileSize: att.fileSize,
                    mimeType: att.mimeType,
                    uploadedById: session.user.id,
                  })),
                });
              }
          } else {
              // Crear nueva actividad y capturar su ID
              const newActivity = await tx.actActivity.create({
                  data: {
                      requirementId: id,
                      name: act.name,
                      description: act.description || "",
                      activityTypeId: existing.activityTypeId,
                      locationId: act.locationId || null,
                      supplierId: act.supplierId || null,
                      startDate: act.startDate ? new Date(act.startDate) : null,
                      endDate: act.endDate ? new Date(act.endDate) : null,
                      statusActivity: act.statusActivity as any,
                      estimatedValue: act.estimatedValue || 0,
                  }
              });

              // Guardar adjuntos de esta nueva actividad usando el índice
              if (activityAttachments && activityAttachments[String(index)] && activityAttachments[String(index)].length > 0) {
                await tx.actActivityAttachment.createMany({
                  data: activityAttachments[String(index)].map(att => ({
                    activityId: newActivity.id,
                    storagePath: att.storagePath,
                    publicUrl: att.publicUrl,
                    fileName: att.fileName,
                    fileSize: att.fileSize,
                    mimeType: att.mimeType,
                    uploadedById: session.user.id,
                  })),
                });
              }
          }
        }
      }

      // 3. Guardar adjuntos nuevos (si se proporcionan)
      if (adjuntos && adjuntos.length > 0) {
        await tx.actAttachment.createMany({
          data: adjuntos.map(adj => ({
            requirementId: id,
            storagePath: adj.storagePath,
            publicUrl: adj.publicUrl,
            fileName: adj.fileName,
            fileSize: adj.fileSize,
            mimeType: adj.mimeType,
            uploadedById: session.user.id,
          })),
        });
      }

      // 4. Registrar en timeline
      await tx.actTimeline.create({
        data: {
          requirementId: id,
          changedById: session.user.id,
          action: "COMMENT",
          comment: "Edición general de requerimiento y actividades",
        },
      });
    });

    revalidatePath(`/actividades/${id}`);
    revalidatePath("/actividades/listado");
    return { success: true };
  } catch (e: any) {
    console.error("[ACT] Error actualizando:", e);
    return { success: false, error: "Error interno al guardar cambios" };
  }
}

// ===== RECEPCIONES =====

/**
 * Obtiene las recepciones de una actividad específica.
 */
export async function getActivityReceptions(activityId: string) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    const receptions = await prisma.actActivityReception.findMany({
      where: { activityId },
      include: {
        receivedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
        evidences: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { receivedAt: "desc" },
    });

    return receptions;
  } catch (error) {
    console.error("Error al obtener recepciones:", error);
    return [];
  }
}

/**
 * Crea una recepción de actividad con sus evidencias.
 */
export async function createReception(data: {
  activityId: string;
  isAccepted: boolean;
  comment?: string;
  evidences?: Array<{
    storagePath: string;
    publicUrl: string;
    fileSize: number;
    mimeType: string;
    capturedAt?: Date;
  }>;
}) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    // Obtener información de la actividad y el requerimiento
    const activity = await prisma.actActivity.findUnique({
      where: { id: data.activityId },
      include: {
        requirement: {  
          select: { id: true, folio: true }
        }
      }
    });

    if (!activity) {
      return { success: false, message: "Actividad no encontrada" };
    }

    // Crear la recepción con evidencias
    const reception = await prisma.actActivityReception.create({
      data: {
        activityId: data.activityId,
        isAccepted: data.isAccepted,
        comment: data.comment,
        receivedById: session.user.id,
        evidences: data.evidences
          ? {
              create: data.evidences.map((ev) => ({
                storagePath: ev.storagePath,
                publicUrl: ev.publicUrl,
                fileSize: ev.fileSize,
                mimeType: ev.mimeType,
                capturedAt: ev.capturedAt,
              })),
            }
          : undefined,
      },
      include: {
        evidences: true,
      },
    });

    // Crear entrada en el timeline del requerimiento
    const actionText = data.isAccepted ? "aprobada" : "rechazada";
    const timelineComment = [
      `Actividad "${activity.name}" ${actionText}`,
      data.comment ? `Comentario: ${data.comment}` : null,
      data.evidences && data.evidences.length > 0 ? `${data.evidences.length} evidencia(s) adjunta(s)` : null,
    ].filter(Boolean).join(" • ");

    await prisma.actTimeline.create({
      data: {
        requirementId: activity.requirement.id,
        changedById: session.user.id,
        action: "RECEPTION",
        comment: timelineComment,
      },
    });

    // Actualizar estado del requerimiento
    await updateRequirementStatus(activity.requirement.id);

    revalidatePath(`/actividades/${activity.requirement.id}`);
    return { success: true, data: reception };
  } catch (error) {
    console.error("Error al crear recepción:", error);
    return { success: false, message: "Error al guardar la recepción" };
  }
}

/**
 * Actualiza el estado del requerimiento según las recepciones APROBADAS de sus actividades.
 * Lógica:
 * - Solo cuenta recepciones con isAccepted = true
 * - Si todas las actividades están aprobadas → FINALIZADO
 * - Si solo una actividad está aprobada → EN_RECEP
 * - Si más de una actividad está aprobada (pero no todas) → REC_PARCIAL
 * - Las recepciones rechazadas (isAccepted = false) NO cuentan como recepcionadas
 */
async function updateRequirementStatus(requirementId: string) {
  try {
    // Obtener todas las actividades del requerimiento
    const activities = await prisma.actActivity.findMany({
      where: { requirementId },
      include: {
        receptions: true,
      },
    });

    // Contadores - Solo contar recepciones ACEPTADAS (isAccepted: true)
    const totalActivities = activities.length;
    const receivedActivities = activities.filter(
      (act) => act.receptions && act.receptions.some((r) => r.isAccepted === true)
    ).length;

    // Si no hay actividades recepcionadas y aceptadas, no hacer nada
    if (receivedActivities === 0) return;

    // Obtener códigos de estado
    const statuses = await prisma.actStatusReq.findMany({
      where: { code: { in: ["EN_RECEP", "REC_PARCIAL", "FINALIZADO"] } },
    });

    const statusInReception = statuses.find((s) => s.code === "EN_RECEP");
    const statusPartial = statuses.find((s) => s.code === "REC_PARCIAL");
    const statusFinished = statuses.find((s) => s.code === "FINALIZADO");

    if (!statusInReception || !statusPartial || !statusFinished) {
      console.error("Estados de recepción no encontrados en la BD");
      return;
    }

    // Determinar nuevo estado
    let newStatusId: string | null = null;

    if (receivedActivities === totalActivities && totalActivities > 0) {
      // Todas las actividades recepcionadas
      newStatusId = statusFinished.id;
    } else if (receivedActivities === 1) {
      // Primera recepción
      newStatusId = statusInReception.id;
    } else if (receivedActivities > 1) {
      // Múltiples recepciones pero no todas
      newStatusId = statusPartial.id;
    }

    // Actualizar solo si hay cambio de estado
    if (newStatusId) {
      const currentReq = await prisma.actRequirement.findUnique({
        where: { id: requirementId },
        select: { statusId: true },
      });

      if (currentReq && currentReq.statusId !== newStatusId) {
        await prisma.actRequirement.update({
          where: { id: requirementId },
          data: { statusId: newStatusId },
        });
      }
    }
  } catch (error) {
    console.error("Error al actualizar estado del requerimiento:", error);
  }
}

/**
 * Obtiene el conteo de recepciones para un requerimiento completo.
 */
export async function getReceptionSummary(requirementId: string) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    const activities = await prisma.actActivity.findMany({
      where: { requirementId },
      include: {
        receptions: {
          select: { id: true, isAccepted: true, receivedAt: true },
        },
      },
    });

    const total = activities.length;
    const received = activities.filter(
      (act) => act.receptions && act.receptions.length > 0
    ).length;
    const pending = total - received;

    return { total, received, pending };
  } catch (error) {
    console.error("Error al obtener resumen de recepciones:", error);
    return { total: 0, received: 0, pending: 0 };
  }
}
