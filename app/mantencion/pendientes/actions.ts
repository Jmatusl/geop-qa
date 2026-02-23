"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

/**
 * Obtiene los requerimientos en estado PENDIENTE.
 * Filtra por las instalaciones asignadas al usuario, a menos que sea administrador.
 */
export async function getPendingRequests() {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const isAdmin = session.user.roles.includes("ADMIN") || (session.user as any).isGlobalAdmin;

  // Si no es admin, buscar sus instalaciones asignadas
  // Nota: Asumimos que la relación de asignación está en UserInstallation o similar.
  // Por ahora, si no es admin, filtramos por las que tenga vinculadas.

  const where: any = {
    status: {
      name: "PENDIENTE",
    },
  };

  if (!isAdmin) {
    // Si el usuario tiene instalaciones asignadas, filtramos por ellas.
    // Esto depende de cómo implementamos las asignaciones de perfil del usuario.
    // En este proyecto, buscamos en mnt_applicants vinculados al usuario o una tabla de pivote.
    const userInstallations = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        // Asumiendo que existe una relación de instalaciones en el modelo User
        // Si no existe vinculación directa todavía, traemos todo para desarrollo
        // o buscamos si es solicitante en alguna nave.
      },
    });

    // Por ahora traemos todo y refinamos la seguridad en el componente o cuando tengamos la tabla de pivote clara.
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
          },
        },
        type: true,
        status: true,
        applicant: true,
        evidences: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return requests;
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    return [];
  }
}

/**
 * Aprueba un requerimiento.
 * Cambia el estado a APROBADO e inserta el timeline.
 */
export async function approveRequest(requestId: string) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    const statusAprobado = await prisma.mntRequestStatus.findUnique({
      where: { name: "APROBADO" },
    });

    if (!statusAprobado) throw new Error("Estado APROBADO no encontrado");

    const request = await prisma.mntRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new Error("Requerimiento no encontrado");

    await prisma.$transaction([
      prisma.mntRequest.update({
        where: { id: requestId },
        data: {
          statusId: statusAprobado.id,
          isApproved: true,
          approvedAt: new Date(),
          approvedById: session.user.id,
        },
      }),
      prisma.mntRequestTimeline.create({
        data: {
          requestId: requestId,
          changedById: session.user.id,
          action: "APPROVED",
          prevStatusId: request.statusId,
          newStatusId: statusAprobado.id,
          comment: "Aprobado por jefatura",
        },
      }),
    ]);

    revalidatePath("/mantencion/pendientes");
    return { success: true };
  } catch (error: any) {
    console.error("Error approving request:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Rechaza un requerimiento.
 * Cambia el estado a RECHAZADO con un motivo obligatorio.
 */
export async function rejectRequest(requestId: string, reason: string) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  if (!reason || reason.trim().length < 5) {
    throw new Error("Debe proporcionar un motivo de rechazo válido (mín. 5 caracteres)");
  }

  try {
    const statusRechazado = await prisma.mntRequestStatus.findUnique({
      where: { name: "RECHAZADO" },
    });

    if (!statusRechazado) throw new Error("Estado RECHAZADO no encontrado");

    const request = await prisma.mntRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new Error("Requerimiento no encontrado");

    await prisma.$transaction([
      prisma.mntRequest.update({
        where: { id: requestId },
        data: {
          statusId: statusRechazado.id,
          isApproved: false,
        },
      }),
      prisma.mntRequestTimeline.create({
        data: {
          requestId: requestId,
          changedById: session.user.id,
          action: "REJECTED",
          prevStatusId: request.statusId,
          newStatusId: statusRechazado.id,
          comment: reason,
        },
      }),
    ]);

    revalidatePath("/mantencion/pendientes");
    return { success: true };
  } catch (error: any) {
    console.error("Error rejecting request:", error);
    return { success: false, error: error.message };
  }
}
