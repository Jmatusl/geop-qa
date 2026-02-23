import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Limpiando datos del Módulo de Mantenimiento...");

  try {
    // 1. Eliminar datos transaccionales (dependen de los mantenedores)
    console.log("Eliminando requerimientos y sus evidencias o timelines...");
    await prisma.mntRequestTimeline.deleteMany();
    await prisma.mntRequestEvidence.deleteMany();
    await prisma.mntRequest.deleteMany();

    // 2. Eliminar relaciones y responsables
    console.log("Eliminando relaciones de equipos y responsables...");
    await prisma.mntEquipmentResponsible.deleteMany();
    await prisma.mntTechnicalResponsible.deleteMany();
    await prisma.mntApplicant.deleteMany();

    // 3. Eliminar Catálogos y Entidades Base
    console.log("Eliminando catálogos e inventario base...");
    await prisma.mntEquipment.deleteMany();
    await prisma.mntSystem.deleteMany();
    await prisma.mntArea.deleteMany();
    await prisma.mntInstallation.deleteMany();

    // 4. Eliminar Tipos y Estados
    console.log("Eliminando Tipos y Estados de requerimiento...");
    await prisma.mntRequestStatus.deleteMany();
    await prisma.mntRequestType.deleteMany();

    // 5. Eliminar Centros de Cultivo y Áreas de Producción
    console.log("Eliminando Centros de Cultivo y Áreas de Producción...");
    await prisma.mntFarmingCenter.deleteMany();
    await prisma.mntProductionArea.deleteMany();

    // 6. Eliminar otros catálogos
    console.log("Eliminando Proveedores, Cargos y Lugares...");
    await prisma.mntSupplier.deleteMany();
    await prisma.mntJobPosition.deleteMany();
    await prisma.mntActivityLocation.deleteMany();
    await prisma.mntSupplyItem.deleteMany();
    await prisma.mntSupplyCategory.deleteMany();

    console.log("✅ Limpieza de Mantenimiento completada exitosamente.");
  } catch (e) {
    console.error("❌ Error durante la limpieza:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
