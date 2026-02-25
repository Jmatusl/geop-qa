"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

const ACT_RULES_KEY = "act_system_rules";

const ACT_RULES_DEFAULTS = {
  folioPrefix: "REQ",
  autoAssign: false,
  storageProvider: "R2",
};

export async function getActSystemConfig() {
  try {
    const rules = await prisma.appSetting.findUnique({ where: { key: ACT_RULES_KEY } });

    return {
      rules: { ...ACT_RULES_DEFAULTS, ...((rules?.value as object) || {}) },
    };
  } catch (error) {
    console.error("[ACT] Error cargando configuración:", error);
    return {
      rules: ACT_RULES_DEFAULTS,
    };
  }
}

export async function saveActSystemConfig(data: { rules: any }) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    await prisma.appSetting.upsert({
      where: { key: ACT_RULES_KEY },
      create: { key: ACT_RULES_KEY, value: data.rules, isActive: true },
      update: { value: data.rules },
    });
    return { success: true };
  } catch (error: any) {
    console.error("[ACT] Error guardando configuración:", error);
    return { success: false, error: "Error interno al guardar" };
  }
}

/**
 * Obtener todos los permisos del usuario actual para el módulo de actividades
 * 
 * @deprecated Usar modulePermissionService.getUserPermissions() en su lugar
 */
export async function getMyActPermissions() {
  const session = await verifySession();
  if (!session) return { autoriza: false, chequea: false, revisa: false, recepciona: false };

  try {
    const { modulePermissionService } = await import("@/lib/services/permissions/module-permission-service");
    const permissions = await modulePermissionService.getUserPermissions(session.user.id, "actividades");

    return {
      autoriza: permissions.includes("autoriza"),
      chequea: permissions.includes("chequea"),
      revisa: permissions.includes("revisa"),
      recepciona: permissions.includes("recepciona"),
    };
  } catch {
    return { autoriza: false, chequea: false, revisa: false, recepciona: false };
  }
}

/**
 * Helper para verificar si un usuario tiene un permiso específico
 * 
 * @deprecated Usar modulePermissionService.userHasPermission() en su lugar
 */
export async function userHasActPermission(userId: string, permission: string): Promise<boolean> {
  try {
    const { modulePermissionService } = await import("@/lib/services/permissions/module-permission-service");
    return await modulePermissionService.userHasPermission(userId, "actividades", permission);
  } catch {
    return false;
  }
}
