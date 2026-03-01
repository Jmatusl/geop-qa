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
      code: "PENDIENTE",
      name: "Pendiente",
      description: "Solicitud registrada y pendiente de revisión",
      color: "slate",
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
      code: "PARCIAL",
      name: "Atención Parcial",
      description: "Solicitud atendida parcialmente",
      color: "amber",
      icon: "PackageMinus",
      displayOrder: 4,
    },
    {
      code: "ENTREGADA",
      name: "Entregada",
      description: "Solicitud completamente entregada",
      color: "green",
      icon: "PackageCheck",
      displayOrder: 5,
    },
    {
      code: "ANULADA",
      name: "Anulada",
      description: "Solicitud anulada por el solicitante o administrador",
      color: "gray",
      icon: "Ban",
      displayOrder: 6,
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

  console.log("  ✅ Módulo de Bodega listo");
}
