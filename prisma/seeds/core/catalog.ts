import { PrismaClient } from "@prisma/client";

export async function seedCatalog(prisma: PrismaClient) {
  console.log("🏭 Sembrando catálogos organizacionales...");

  // 1. Cargos
  const jobPositions = [
    { code: "GGEN", name: "Gerente General" },
    { code: "DIRLAB", name: "Director Técnico de Laboratorio" },
    { code: "PATVET", name: "Patólogo Veterinario" },
    { code: "HISTO", name: "Tecnólogo en Histopatología" },
    { code: "MICRO", name: "Analista de Microbiología" },
    { code: "BIOMOL", name: "Analista de Biología Molecular" },
    { code: "MUEST", name: "Muestreador de Centros de Cultivo" },
    { code: "RECEPC", name: "Recepción y Custodia de Muestras" },
    { code: "CALIDAD", name: "Encargado de Aseguramiento de Calidad" },
  ];
  for (const job of jobPositions) {
    await prisma.jobPosition.upsert({
      where: { code: job.code },
      update: {},
      create: job,
    });
  }

  // 2. Áreas
  const areas = [
    { code: "ADM", name: "Administración" },
    { code: "OPS", name: "Operaciones" },
    { code: "MANT", name: "Veterinaria" },
  ];
  for (const area of areas) {
    await prisma.area.upsert({
      where: { code: area.code },
      update: {},
      create: area,
    });
  }

  // 3. Grupos de Trabajo
  const workGroups = [
    { code: "ARAUCANIA", name: "Región de La Araucanía" },
    { code: "LOS_RIOS", name: "Región de Los Ríos" },
    { code: "LOS_LAGOS", name: "Región de Los Lagos" },
    { code: "AYSEN", name: "Región de Aysén" },
    { code: "MAGALLANES", name: "Región de Magallanes" },
  ];
  for (const group of workGroups) {
    await prisma.workGroup.upsert({
      where: { code: group.code },
      update: {},
      create: group,
    });
  }

  console.log("   ✓ Catálogos sembrados");
  return { jobPositions, areas, workGroups };
}
