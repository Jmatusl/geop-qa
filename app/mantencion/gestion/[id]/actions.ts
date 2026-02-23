"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

/**
 * Obtiene el detalle completo de un requerimiento.
 */
export async function getRequestDetail(id: string) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    const request = await prisma.mntRequest.findUnique({
      where: { id },
      include: {
        installation: true,
        equipment: {
          include: {
            system: {
              include: { area: true },
            },
          },
        },
        type: true,
        status: true,
        applicant: true,
        evidences: {
          orderBy: { createdAt: "desc" },
        },
        timeline: {
          include: {
            changedBy: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
            prevStatus: true,
            newStatus: true,
          },
          orderBy: { createdAt: "desc" },
        },
        iterations: {
          include: {
            createdBy: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        expenses: {
          orderBy: { createdAt: "desc" },
        },
        createdBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    return request;
  } catch (error) {
    console.error("Error al obtener detalle del requerimiento:", error);
    return null;
  }
}

/**
 * Agrega una iteración técnica (avance/revisión).
 */
export async function addIteration(requestId: string, description: string, technicianName?: string) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    const iteration = await prisma.mntRequestIteration.create({
      data: {
        requestId,
        description,
        technicianName,
        createdById: session.userId,
      },
    });

    await prisma.mntRequestTimeline.create({
      data: {
        requestId,
        changedById: session.userId,
        action: "ITERATION_ADDED",
        comment: `Avance técnico registrado: ${description.substring(0, 50)}${description.length > 50 ? "..." : ""}`,
      },
    });

    revalidatePath(`/mantencion/gestion/${requestId}`);
    return { success: true, iteration };
  } catch (error: any) {
    console.error("Error al agregar iteración:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Agrega un gasto relacionado (repuesto/mano de obra).
 */
export async function addExpense(data: { requestId: string; description: string; amount: number; type: string; quantity: number }) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    const expense = await prisma.mntRequestExpense.create({
      data: {
        requestId: data.requestId,
        description: data.description,
        amount: Math.round(data.amount), // CLP: entero sin decimales
        type: data.type,
        quantity: Math.round(data.quantity),
      },
    });

    await prisma.mntRequestTimeline.create({
      data: {
        requestId: data.requestId,
        changedById: session.userId,
        action: "EXPENSE_ADDED",
        comment: `Gasto registrado: ${data.description} (${data.type}) por $${Math.round(data.amount).toLocaleString("es-CL")}`,
      },
    });

    revalidatePath(`/mantencion/gestion/${data.requestId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error al agregar gasto:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Actualiza la fecha estimada con un motivo (mantiene historial en el timeline).
 */
export async function updateEstimatedDate(requestId: string, date: Date, reason: string) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    const prevRequest = await prisma.mntRequest.findUnique({
      where: { id: requestId },
      select: { estimatedEndDate: true },
    });

    await prisma.mntRequest.update({
      where: { id: requestId },
      data: { estimatedEndDate: date },
    });

    await prisma.mntRequestTimeline.create({
      data: {
        requestId,
        changedById: session.userId,
        action: "REPROGRAMMED",
        comment: `Fecha estimada actualizada: ${reason}`,
      },
    });

    revalidatePath(`/mantencion/gestion/${requestId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error al actualizar fecha estimada:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Agrega más evidencias (fotos) al requerimiento.
 */
export async function addEvidence(requestId: string, urls: string[]) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    await prisma.mntRequestEvidence.createMany({
      data: urls.map((url) => ({
        requestId,
        storagePath: url,
        publicUrl: url,
        mimeType: url.split(".").pop() === "pdf" ? "application/pdf" : "image/jpeg",
        capturedAt: new Date(),
      })),
    });

    await prisma.mntRequestTimeline.create({
      data: {
        requestId,
        changedById: session.userId,
        action: "EVIDENCE_ADDED",
        comment: `Se agregaron ${urls.length} nuevas fotografías de evidencia`,
      },
    });

    revalidatePath(`/mantencion/gestion/${requestId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error al agregar evidencia:", error);
    return { success: false, error: error.message };
  }
}
