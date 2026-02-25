import { PrismaClient } from "@prisma/client";

export async function seedMantencionMock(prisma: PrismaClient) {
  console.log("🛠️  Mock Data de Mantenimiento [OMITIDO - Usar Standalone]");
  console.log("   ℹ️  Para cargar datos mock de mantenimiento, ejecute:");
  console.log("      npx tsx prisma/seed-standalone-mantencion.ts");
  return;
}
