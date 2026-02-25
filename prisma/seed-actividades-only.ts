import { PrismaClient } from "@prisma/client";
import { seedActividadesMock } from "./seeds/mock/seed-actividades-mock";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Ejecutando Mock Seed — Actividades");
  try {
    await seedActividadesMock(prisma);
    console.log("✅ Mock Data de Actividades cargada exitosamente.");
  } catch (e) {
    console.error("❌ Error:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
