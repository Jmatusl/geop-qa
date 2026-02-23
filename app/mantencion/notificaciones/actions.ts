"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function getUserNotificationPreferences() {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  const prefs = await prisma.mntUserNotificationPreference.findUnique({
    where: { userId: session.userId },
  });

  if (!prefs) {
    // Si no existen, crear con valores por defecto (todos true)
    return await prisma.mntUserNotificationPreference.create({
      data: {
        userId: session.userId,
        emailEnabled: true,
        onNewRequest: true,
        onApproval: true,
        onReprogram: true,
        onClose: true,
      },
    });
  }

  return prefs;
}

export async function saveUserNotificationPreferences(data: any) {
  try {
    const session = await verifySession();
    if (!session) return { success: false, error: "No autorizado" };

    await prisma.mntUserNotificationPreference.upsert({
      where: { userId: session.userId },
      update: {
        emailEnabled: data.emailEnabled,
        onNewRequest: data.onNewRequest,
        onApproval: data.onApproval,
        onReprogram: data.onReprogram,
        onClose: data.onClose,
      },
      create: {
        userId: session.userId,
        emailEnabled: data.emailEnabled,
        onNewRequest: data.onNewRequest,
        onApproval: data.onApproval,
        onReprogram: data.onReprogram,
        onClose: data.onClose,
      },
    });

    revalidatePath("/mantencion/notificaciones");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving notification preferences:", error);
    return { success: false, error: "Error al guardar preferencias" };
  }
}
