"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { RequerimientoSchema, RequerimientoFormData } from "./schema";

// RequerimientoSchema and RequerimientoFormData are now imported from ./schema.ts

export async function crearRequerimiento(data: RequerimientoFormData) {
  try {
    const session = await verifySession();
    if (!session) {
      return { success: false, error: "No autorizado" };
    }

    // Validate input
    const validatedData = RequerimientoSchema.safeParse(data);
    if (!validatedData.success) {
      return { success: false, error: validatedData.error.errors[0].message };
    }

    const { installationId, equipmentId, typeId, applicantId, description, evidences } = validatedData.data;

    // Get "Pendiente" status ID
    const pendingStatus = await prisma.mntRequestStatus.findUnique({
      where: { name: "Pendiente" },
    });

    if (!pendingStatus) {
      return { success: false, error: "Estado 'Pendiente' no encontrado en el sistema." };
    }

    // Get configured prefix
    const config = await prisma.appSetting.findUnique({ where: { key: "mnt_system_rules" } });
    const rules = config?.value as any;
    const prefix = rules?.internalPrefix || "RD";

    // Create transaction
    const newRequest = await prisma.$transaction(async (tx) => {
      // 1. Create Request
      const req = await tx.mntRequest.create({
        data: {
          installationId,
          equipmentId,
          typeId,
          statusId: pendingStatus.id,
          applicantId: applicantId || undefined,
          description,
          folioPrefix: prefix,
          createdById: session.userId,
          isApproved: false,
        },
      });

      // 2. Add Evidences if any
      if (evidences && evidences.length > 0) {
        await tx.mntRequestEvidence.createMany({
          data: evidences.map((url) => ({
            requestId: req.id,
            storagePath: url,
            publicUrl: url,
            mimeType: url.split(".").pop() === "pdf" ? "application/pdf" : "image/jpeg", // Simple deduction
            capturedAt: new Date(),
          })),
        });
      }

      // 3. Create Timeline entry
      await tx.mntRequestTimeline.create({
        data: {
          requestId: req.id,
          changedById: session.userId,
          action: "CREATED",
          newStatusId: pendingStatus.id,
          comment: "Solicitud ingresada al sistema",
        },
      });

      return req;
    });

    revalidatePath("/mantencion/pendientes");
    revalidatePath("/mantencion/consolidado");

    return { success: true, folio: `${newRequest.folioPrefix}-${newRequest.folio}` };
  } catch (error: any) {
    console.error("Error al crear requerimiento:", error);
    return { success: false, error: "Error interno al crear el requerimiento." };
  }
}

export async function buscarEquipos(query: string, installationId?: string) {
  if (!query || query.length < 2) return [];

  const session = await verifySession();
  if (!session) return [];

  try {
    const equipos = (await prisma.mntEquipment.findMany({
      where: {
        installationId: installationId || undefined,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { system: { name: { contains: query, mode: "insensitive" } } },
          { system: { area: { name: { contains: query, mode: "insensitive" } } } },
        ],
      },
      include: {
        system: {
          include: {
            area: true,
          },
        },
        installation: {
          select: { name: true },
        },
      },
      take: 20,
    } as any)) as any[];

    return equipos.map((e) => ({
      id: e.id,
      name: e.name,
      brand: e.brand || "",
      model: e.model || "",
      systemId: e.system.id,
      systemName: e.system.name,
      areaId: e.system.area.id,
      areaName: e.system.area.name,
      installationId: e.installationId,
      installationName: e.installation?.name || "Desconocida",
    }));
  } catch (error) {
    console.error("Error buscando equipos:", error);
    return [];
  }
}
