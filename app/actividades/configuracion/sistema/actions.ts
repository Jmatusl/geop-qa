"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

const ACT_RULES_KEY = "act_system_rules";
const ACT_NOTIFICATIONS_KEY = "act_notification_rules";
const ACT_PERMISSIONS_KEY = "act_user_permissions";

const ACT_RULES_DEFAULTS = {
  folioPrefix: "REQ",
  autoAssign: false,
  storageProvider: "R2",
};

const ACT_NOTIFICATIONS_DEFAULTS = {
  emailEnabled: false,
  onNewRequest: true,
  onAssign: true,
  onStatusChange: true,
  onComplete: true,
};

export async function getActSystemConfig() {
  try {
    const [rules, notifications, permissions] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: ACT_RULES_KEY } }),
      prisma.appSetting.findUnique({ where: { key: ACT_NOTIFICATIONS_KEY } }),
      prisma.appSetting.findUnique({ where: { key: ACT_PERMISSIONS_KEY } }),
    ]);

    return {
      rules: { ...ACT_RULES_DEFAULTS, ...((rules?.value as object) || {}) },
      notifications: { ...ACT_NOTIFICATIONS_DEFAULTS, ...((notifications?.value as object) || {}) },
      permissions: (permissions?.value as any[]) || [],
    };
  } catch (error) {
    console.error("[ACT] Error cargando configuración:", error);
    return {
      rules: ACT_RULES_DEFAULTS,
      notifications: ACT_NOTIFICATIONS_DEFAULTS,
      permissions: [],
    };
  }
}

export async function saveActSystemConfig(data: { rules: any; notifications: any; permissions: any }) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    await prisma.$transaction([
      prisma.appSetting.upsert({
        where: { key: ACT_RULES_KEY },
        create: { key: ACT_RULES_KEY, value: data.rules, isActive: true },
        update: { value: data.rules },
      }),
      prisma.appSetting.upsert({
        where: { key: ACT_NOTIFICATIONS_KEY },
        create: { key: ACT_NOTIFICATIONS_KEY, value: data.notifications, isActive: true },
        update: { value: data.notifications },
      }),
      prisma.appSetting.upsert({
        where: { key: ACT_PERMISSIONS_KEY },
        create: { key: ACT_PERMISSIONS_KEY, value: data.permissions, isActive: true },
        update: { value: data.permissions },
      }),
    ]);
    return { success: true };
  } catch (error: any) {
    console.error("[ACT] Error guardando configuración:", error);
    return { success: false, error: "Error interno al guardar" };
  }
}

const ACT_PERMISSIONS = {
  AUTORIZA: "autoriza",
  CHEQUEA: "chequea",
  REVISA: "revisa",
  RECEPCIONA: "recepciona",
};

/**
 * Obtener todos los permisos del usuario actual para el módulo de actividades
 */
export async function getMyActPermissions() {
  const session = await verifySession();
  if (!session) return { autoriza: false, chequea: false, revisa: false, recepciona: false };

  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: ACT_PERMISSIONS_KEY } });
    const permissions = (setting?.value as any[]) || [];
    const userEntry = permissions.find((p: any) => p.userId === session.user.id);

    const userPerms = new Set(userEntry?.permissions || []);

    return {
      autoriza: userPerms.has(ACT_PERMISSIONS.AUTORIZA),
      chequea: userPerms.has(ACT_PERMISSIONS.CHEQUEA),
      revisa: userPerms.has(ACT_PERMISSIONS.REVISA),
      recepciona: userPerms.has(ACT_PERMISSIONS.RECEPCIONA),
    };
  } catch {
    return { autoriza: false, chequea: false, revisa: false, recepciona: false };
  }
}

/**
 * Helper para verificar si un usuario tiene un permiso específico
 */
export async function userHasActPermission(userId: string, permission: string): Promise<boolean> {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: ACT_PERMISSIONS_KEY } });
    const permissions = (setting?.value as any[]) || [];
    const userEntry = permissions.find((p: any) => p.userId === userId);
    return userEntry?.permissions?.includes(permission) || false;
  } catch {
    return false;
  }
}
