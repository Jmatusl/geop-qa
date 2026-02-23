"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

const MNT_RULES_KEY = "mnt_system_rules";
const MNT_NOTIFICATIONS_KEY = "mnt_notification_rules";

/**
 * Obtiene la configuración global del sistema de mantenimiento.
 */
export async function getMntSystemConfig() {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const [rules, notifications] = await Promise.all([prisma.appSetting.findUnique({ where: { key: MNT_RULES_KEY } }), prisma.appSetting.findUnique({ where: { key: MNT_NOTIFICATIONS_KEY } })]);

  return {
    rules: rules?.value || {
      autoApprovalEnabled: false,
      crossApprovalEnabled: false,
      crossApprovers: [],
      autoApprovalTypes: [],
      storageProvider: "R2", // R2 | Cloudinary
      internalPrefix: "RD",
      workReqPrefix: "RT",
    },
    notifications: notifications?.value || {
      emailEnabled: true,
      onNewRequest: true,
      onApproval: true,
      onReprogram: true,
      onClose: true,
    },
  };
}

/**
 * Guarda la configuración del sistema.
 */
export async function saveMntSystemConfig(data: { rules: any; notifications: any }) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    await prisma.$transaction([
      prisma.appSetting.upsert({
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
      }),
      prisma.appSetting.upsert({
        where: { key: MNT_NOTIFICATIONS_KEY },
        create: {
          key: MNT_NOTIFICATIONS_KEY,
          value: data.notifications,
          description: "Configuración de notificaciones - Mantención",
          updatedById: session.user.id,
        },
        update: {
          value: data.notifications,
          updatedById: session.user.id,
        },
      }),
    ]);

    revalidatePath("/mantencion/configuracion/sistema");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving mnt config:", error);
    return { success: false, error: error.message };
  }
}
