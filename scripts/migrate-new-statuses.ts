/**
 * Script: Migración de Estados (CANCELADA y PARCIAL)
 * Archivo: scripts/migrate-new-statuses.ts
 * 
 * Agrega los nuevos estados sin afectar datos existentes
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Agregando nuevos estados al sistema...\n");

  try {
    // 1. Estado CANCELADA para cotizaciones
    const existingCancelada = await prisma.quotationStatusMaster.findUnique({
      where: { code: "CANCELADA" },
    });

    if (!existingCancelada) {
      await prisma.quotationStatusMaster.create({
        data: {
          code: "CANCELADA",
          name: "Cancelada",
          description: "Cancelada automáticamente por aprobación de otra cotización",
          color: "orange",
          icon: "AlertCircle",
          displayOrder: 7,
        },
      });
      console.log("✅ Estado CANCELADA creado para cotizaciones");
    } else {
      console.log("ℹ️  Estado CANCELADA ya existe para cotizaciones");
    }

    // 2. Estado PARCIAL para solicitudes
    const existingParcial = await prisma.supplyRequestStatusMaster.findUnique({
      where: { code: "PARCIAL" },
    });

    if (!existingParcial) {
      // Primero, actualizar displayOrder de estados existentes
      await prisma.supplyRequestStatusMaster.updateMany({
        where: { displayOrder: { gte: 4 } },
        data: {
          displayOrder: {
            increment: 1,
          },
        },
      });

      // Crear nuevo estado
      await prisma.supplyRequestStatusMaster.create({
        data: {
          code: "PARCIAL",
          name: "Parcialmente Aprobada",
          description: "Algunos ítems aprobados, otros en proceso o rechazados",
          color: "yellow",
          icon: "Loader",
          displayOrder: 4,
        },
      });
      console.log("✅ Estado PARCIAL creado para solicitudes");
    } else {
      console.log("ℹ️  Estado PARCIAL ya existe para solicitudes");
    }

    console.log("\n✨ Migración completada exitosamente");
  } catch (error) {
    console.error("❌ Error en la migración:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
