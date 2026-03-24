/**
 * Seed: Módulo de Bodega
 * Archivo: prisma/seeds/seed-bodega.ts
 */

import { PrismaClient } from "@prisma/client";

export async function seedBodega(prismaClient: PrismaClient) {
  console.log("📦 Seeding Módulo de Bodega...");

  // ============================================
  // 1. CONFIGURACIÓN GENERAL BODEGA
  // ============================================
  await prismaClient.appSetting.upsert({
    where: { key: "BODEGA_GENERAL_CONFIG" },
    create: {
      key: "BODEGA_GENERAL_CONFIG",
      description: "Configuración general del módulo de bodega (Ingresos, Egresos, OC)",
      isActive: true,
      value: {
        auto_ejecutar_oc: false,
        auto_aprobar_solicitudes: false,
        ingresos_evidencia_obligatoria: false,
        egresos_evidencia_obligatoria: false,
        ocultar_transito: true,
        alertar_stock_minimo: true,
      },
    },
    update: {}, // No sobrescribir si ya existe, para pruebas manuales
  });
  console.log("   ✓ Configuración general de bodega creada");

  await prismaClient.bodegaWarehouse.upsert({
    where: { code: "TRANSITO" },
    create: {
      code: "TRANSITO",
      name: "EN TRÁNSITO",
      description: "Bodega virtual para movimientos inter-bodegas (Trazabilidad)",
      location: "VIRTUAL",
      isActive: true,
    },
    update: { isActive: true },
  });
  console.log("   ✓ Bodega virtual de TRÁNSITO creada");

  console.log("  ✅ Módulo de Bodega listo");
}
