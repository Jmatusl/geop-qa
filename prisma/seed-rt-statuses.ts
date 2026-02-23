import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Work Requirement Statuses...");

  const statuses = [
    { name: "PENDIENTE", colorHex: "#64748b", displayOrder: 1 },
    { name: "APROBADO", colorHex: "#3b82f6", displayOrder: 2 },
    { name: "OC GENERADA", colorHex: "#f59e0b", displayOrder: 3 },
    { name: "FACTURADO", colorHex: "#8b5cf6", displayOrder: 4 },
    { name: "FINALIZADO", colorHex: "#10b981", displayOrder: 5 },
  ];

  for (const status of statuses) {
    await prisma.mntWorkRequirementStatus.upsert({
      where: { name: status.name },
      update: status,
      create: status,
    });
  }

  console.log("Seed finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
