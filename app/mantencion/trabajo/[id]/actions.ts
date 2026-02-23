"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

/**
 * Obtiene el detalle completo de un Requerimiento de Trabajo (RT).
 */
export async function getWorkRequirementDetail(id: string) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    const wr = await prisma.mntWorkRequirement.findUnique({
      where: { id },
      include: {
        provider: true,
        status: true,
        createdBy: {
          select: { firstName: true, lastName: true, email: true },
        },
        requests: {
          include: {
            request: {
              include: {
                installation: true,
                equipment: {
                  select: { name: true, brand: true, model: true },
                },
                status: true,
              },
            },
          },
        },
        evidences: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return wr;
  } catch (error) {
    console.error("Error al obtener detalle del RT:", error);
    return null;
  }
}

/**
 * Actualiza los datos administrativos de un RT.
 */
export async function updateWorkRequirementAdminData(
  id: string,
  data: {
    ocNumber?: string;
    ocValue?: number;
    invoiceNumber?: string;
    invoiceValue?: number;
    requisitionNumber?: string;
    statusId?: string;
    title?: string;
    description?: string;
  },
) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    const updated = await prisma.mntWorkRequirement.update({
      where: { id },
      data: {
        ...data,
      },
    });

    revalidatePath(`/mantencion/trabajo/${id}`);
    revalidatePath("/mantencion/consolidado");
    return { success: true, wr: updated };
  } catch (error: any) {
    console.error("Error al actualizar RT:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Agrega evidencias fotográficas/documentales a un RT.
 */
export async function addWREvidences(wrId: string, urls: string[]) {
  const session = await verifySession();
  if (!session) return { success: false, error: "No autorizado" };

  try {
    await prisma.mntWorkRequirementEvidence.createMany({
      data: urls.map((url) => ({
        workRequirementId: wrId,
        storagePath: url,
        publicUrl: url,
        mimeType: url.split(".").pop() === "pdf" ? "application/pdf" : "image/jpeg",
        capturedAt: new Date(),
      })),
    });

    const createdEvidences = await prisma.mntWorkRequirementEvidence.findMany({
      where: {
        workRequirementId: wrId,
        storagePath: { in: urls },
      },
    });

    revalidatePath(`/mantencion/trabajo/${wrId}`);
    return { success: true, evidences: createdEvidences };
  } catch (error: any) {
    console.error("Error al agregar evidencias RT:", error);
    return { success: false, error: "Error interno al guardar evidencias" };
  }
}

/**
 * Elimina una evidencia de un RT.
 */
export async function deleteWREvidence(wrId: string, evidenceId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: "No autorizado" };

  try {
    const evidence = await prisma.mntWorkRequirementEvidence.findFirst({
      where: {
        id: evidenceId,
        workRequirementId: wrId,
      },
    });

    if (!evidence) {
      return { success: false, error: "Evidencia no encontrada" };
    }

    // Nota: La eliminación física en R2 se podría delegar a un job o hacerlo sincrónico
    // Por simplicidad eliminamos el registro de BD
    await prisma.mntWorkRequirementEvidence.delete({
      where: { id: evidenceId },
    });

    revalidatePath(`/mantencion/trabajo/${wrId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar evidencia RT:", error);
    return { success: false, error: "Error interno al eliminar evidencia" };
  }
}
