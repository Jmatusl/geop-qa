"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

const MNT_RULES_KEY = "mnt_system_rules";

/**
 * Obtiene la configuración global del sistema de mantenimiento.
 */
export async function getMntSystemConfig() {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const rules = await prisma.appSetting.findUnique({ where: { key: MNT_RULES_KEY } });

  return {
    rules: rules?.value || {
      autoApprovalEnabled: false,
      crossApprovalEnabled: false,
      autoApprovalTypes: [],
      storageProvider: "R2", // R2 | Cloudinary
      internalPrefix: "RD",
      workReqPrefix: "RT",
      requireCosts: false,
    },
  };
}

/**
 * Guarda la configuración del sistema.
 */
export async function saveMntSystemConfig(data: { rules: any }) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    await prisma.appSetting.upsert({
      where: { key: MNT_RULES_KEY },
      create: {
        key: MNT_RULES_KEY,
        value: data.rules,
        description: "Reglas globales de aprobación y almacenamiento - Mantención",
        updatedById: session.user.id,
      },
      update: {
        value: data.rules,
        updatedById: session.user.id,
      },
    });

    revalidatePath("/mantencion/configuracion/sistema");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving mnt config:", error);
    return { success: false, error: error.message };
  }
}
