"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

const INSUMOS_CONFIG_KEY = "insumos_config";

const INSUMOS_CONFIG_DEFAULTS = {
  defaultDeadlineDays: 7,
};

export async function getInsumosSystemConfig() {
  try {
    const config = await prisma.appSetting.findUnique({ where: { key: INSUMOS_CONFIG_KEY } });

    return {
      config: { ...INSUMOS_CONFIG_DEFAULTS, ...(config?.value as object) || {} },
    };
  } catch (error) {
    console.error("[INSUMOS] Error cargando configuración:", error);
    return {
      config: INSUMOS_CONFIG_DEFAULTS,
    };
  }
}

export async function saveInsumosSystemConfig(data: { config: any }) {
  const session = await verifySession();
  if (!session) throw new Error("No autorizado");

  try {
    await prisma.appSetting.upsert({
      where: { key: INSUMOS_CONFIG_KEY },
      create: { key: INSUMOS_CONFIG_KEY, value: data.config, isActive: true },
      update: { value: data.config },
    });
    return { success: true };
  } catch (error: any) {
    console.error("[INSUMOS] Error guardando configuración:", error);
    return { success: false, error: "Error interno al guardar" };
  }
}
