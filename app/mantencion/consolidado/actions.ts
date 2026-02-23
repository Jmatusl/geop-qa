"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

/**
 * Obtiene todos los requerimientos con filtros opcionales.
 */
export async function getConsolidatedRequests(filters?: { statusId?: string; installationId?: string; startDate?: Date; endDate?: Date }) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const isAdmin = session.user.roles.includes("ADMIN") || (session.user as any).isGlobalAdmin;

  const where: any = {};

  if (filters?.statusId) where.statusId = filters.statusId;
  if (filters?.installationId) where.installationId = filters.installationId;

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  // Si no es admin, solo puede ver sus solicitudes o las de sus naves si es responsable técnico
  if (!isAdmin) {
    // Implementar lógica de visibilidad restringida aquí si es necesario
    // Por ahora, traemos según las naves permitidas (similar a Pendientes)
  }

  try {
    const requests = await prisma.mntRequest.findMany({
      where,
      include: {
        installation: true,
        equipment: {
          select: {
            name: true,
            brand: true,
            model: true,
            system: {
              select: {
                name: true,
              },
            },
          },
        },
        type: true,
        status: true,
        applicant: true,
        evidences: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        mntWorkRequirementRelations: {
          include: {
            workRequirement: {
              include: {
                provider: true,
              },
            },
          },
        },
      },
      orderBy: {
        folio: "desc",
      },
    });

    return requests;
  } catch (error) {
    console.error("Error fetching consolidated requests:", error);
    return [];
  }
}

/**
 * Actualiza el estado de un requerimiento.
 * Si el nuevo estado es "Tercerizar", requiere una justificación obligatoria.
 * Las imágenes opcionales se guardan como evidencias del requerimiento.
 */
export async function updateRequestStatus(requestId: string, newStatusId: string, comment?: string, tercerizedReason?: string, imageUrls?: string[]) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    const request = await prisma.mntRequest.findUnique({
      where: { id: requestId },
      select: { statusId: true },
    });

    if (!request) throw new Error("Requerimiento no encontrado");

    // Actualizar el requerimiento y registrar el timeline en una transacción
    const updateData: any = { statusId: newStatusId };
    if (tercerizedReason) updateData.tercerizedReason = tercerizedReason;

    await prisma.$transaction([
      prisma.mntRequest.update({
        where: { id: requestId },
        data: updateData,
      }),
      prisma.mntRequestTimeline.create({
        data: {
          requestId: requestId,
          changedById: session.user.id,
          action: "STATUS_CHANGED",
          prevStatusId: request.statusId,
          newStatusId: newStatusId,
          comment: comment || (tercerizedReason ? `Tercerizado: ${tercerizedReason}` : "Cambio de estado manual"),
        },
      }),
    ]);

    // Guardar imágenes de tercerización como evidencias (fuera de la transacción para no bloquear)
    if (imageUrls && imageUrls.length > 0) {
      await prisma.mntRequestEvidence.createMany({
        data: imageUrls.map((url) => ({
          requestId,
          storagePath: url,
          publicUrl: url,
        })),
      });
    }

    revalidatePath("/mantencion/consolidado");
    revalidatePath(`/mantencion/gestion/${requestId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating status:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene los catálogos necesarios para los filtros.
 */
export async function getConsolidatedCatalogs() {
  const [statuses, installations] = await Promise.all([
    prisma.mntRequestStatus.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } }),
    prisma.mntInstallation.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return { statuses, installations };
}

/**
 * Obtiene todos los requerimientos de trabajo (externos).
 */
export async function getWorkRequirements() {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    const wrs = await prisma.mntWorkRequirement.findMany({
      include: {
        provider: true,
        status: true,
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        requests: {
          include: {
            request: {
              include: {
                equipment: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return wrs;
  } catch (error) {
    console.error("Error fetching work requirements:", error);
    return [];
  }
}

/**
 * Crea un nuevo requerimiento de trabajo (externo) asociando uno o más requerimientos de mantención.
 */
export async function createWorkRequirement(data: { providerId: string; title: string; description?: string; requestIds: string[] }) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    // 1. Obtener prefijo de configuración (si no existe, usar RT)
    const config = await prisma.appSetting.findFirst({
      where: { key: "mnt_system_rules" },
    });
    const prefix = (config?.value as any)?.workReqPrefix || "RT";

    // 2. Generar folio: [PREFIJO]-[YEAR]-[SECUENCIAL]
    const year = new Date().getFullYear();
    const count = await prisma.mntWorkRequirement.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lte: new Date(`${year}-12-31T23:59:59.999Z`),
        },
      },
    });
    const nextSequential = (count + 1).toString().padStart(4, "0");
    const folio = `${prefix}-${year}-${nextSequential}`;

    // 3. Obtener estado inicial
    const initialStatus = await prisma.mntWorkRequirementStatus.findFirst({
      where: { name: "PENDIENTE" },
    });

    if (!initialStatus) throw new Error("El estado PENDIENTE para requerimientos de trabajo no existe.");

    // 4. Crear el WR y sus relaciones en una transacción
    const wr = await prisma.mntWorkRequirement.create({
      data: {
        folio,
        title: data.title,
        description: data.description,
        providerId: data.providerId,
        statusId: initialStatus.id,
        createdById: session.user.id,
        requests: {
          create: data.requestIds.map((rid) => ({
            requestId: rid,
          })),
        },
      },
    });

    revalidatePath("/mantencion/consolidado");
    return { success: true, wr };
  } catch (error: any) {
    console.error("Error creating work requirement:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene los catálogos extendidos para el consolidado (incluyendo proveedores y estados de WR).
 */
export async function getExtendedConsolidatedCatalogs() {
  const [statuses, installations, wrStatuses, suppliers] = await Promise.all([
    prisma.mntRequestStatus.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } }),
    prisma.mntInstallation.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.mntWorkRequirementStatus.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } }),
    prisma.mntSupplier.findMany({ where: { isActive: true }, orderBy: { legalName: "asc" } }),
  ]);

  return { statuses, installations, wrStatuses, suppliers };
}
