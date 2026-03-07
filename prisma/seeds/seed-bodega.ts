/**
 * Seed: Módulo de Bodega
 * Archivo: prisma/seeds/seed-bodega.ts
 */

import { PrismaClient } from "@prisma/client";

export async function seedBodega(prismaClient: PrismaClient) {
  console.log("📦 Seeding Módulo de Bodega...");

  // ============================================
  // 1. ESTADOS DE SOLICITUD INTERNA
  // ============================================
  const statuses = [
    {
      code: "BORRADOR",
      name: "Borrador",
      description: "Solicitud registrada pero no enviada a aprobación",
      color: "slate",
      icon: "Clock",
      displayOrder: 0,
    },
    {
      code: "PENDIENTE",
      name: "Pendiente",
      description: "Solicitud registrada y pendiente de revisión",
      color: "amber",
      icon: "Clock",
      displayOrder: 1,
    },
    {
      code: "APROBADA",
      name: "Aprobada",
      description: "Solicitud aprobada para preparación o entrega",
      color: "emerald",
      icon: "CheckCircle",
      displayOrder: 2,
    },
    {
      code: "RECHAZADA",
      name: "Rechazada",
      description: "Solicitud rechazada por falta de stock o validación",
      color: "red",
      icon: "XCircle",
      displayOrder: 3,
    },
    {
      code: "EN_PREPARACION",
      name: "En Preparación",
      description: "Artículos siendo recolectados en bodega",
      color: "blue",
      icon: "Package",
      displayOrder: 4,
    },
    {
      code: "PREPARADA",
      name: "En Preparación",
      description: "Solicitud verificada, artículos listos para retiro físico",
      color: "indigo",
      icon: "Package",
      displayOrder: 5,
    },
    {
      code: "LISTA_PARA_ENTREGA",
      name: "Lista para Entrega",
      description: "Artículos listos en el mesón de entrega",
      color: "indigo",
      icon: "ClipboardCheck",
      displayOrder: 6,
    },
    {
      code: "PARCIAL",
      name: "Entrega Parcial",
      description: "Solicitud entregada parcialmente, con ítems pendientes",
      color: "purple",
      icon: "PackageCheck",
      displayOrder: 7,
    },
    {
      code: "ENTREGADA",
      name: "Entregada",
      description: "Productos entregados satisfactoriamente",
      color: "slate",
      icon: "Check",
      displayOrder: 8,
    },
    {
      code: "ANULADA",
      name: "Anulada",
      description: "Solicitud cancelada definitivamente",
      color: "gray",
      icon: "Ban",
      displayOrder: 9,
    },
  ];

  let statusesUpserted = 0;
  for (const status of statuses) {
    await prismaClient.bodegaInternalRequestStatusMaster.upsert({
      where: { code: status.code },
      create: status,
      update: {
        name: status.name,
        description: status.description,
        color: status.color,
        icon: status.icon,
        displayOrder: status.displayOrder,
        isActive: true,
      },
    });
    statusesUpserted++;
  }
  console.log(`   ✓ Estados de solicitud interna: ${statusesUpserted} upserted`);

  // ============================================
  // 2. CONFIGURACIÓN GENERAL BODEGA
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
        ingresos_evidencia_obligatoria: true,
        egresos_evidencia_obligatoria: true,
        ocultar_transito: false,
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
