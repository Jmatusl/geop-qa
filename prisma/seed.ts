import { PrismaClient } from "@prisma/client";
import { cleanup } from "./seeds/core/cleanup";
import { seedRoles } from "./seeds/core/roles";
import { seedSettings } from "./seeds/core/settings";
import { seedEmailTemplates } from "./seeds/core/email-templates";
import { seedCatalog } from "./seeds/core/catalog";
import { seedAdmin } from "./seeds/core/admin";
import { seedMockWorkers } from "./seeds/mock/workers";
import { seedMantencion } from "./seeds/seed-mantencion";
import { seedMantencionMock } from "./seeds/mock/seed-mantencion-mock";
import { seedActividades } from "./seeds/seed-actividades";
import { seedActividadesMock } from "./seeds/mock/seed-actividades-mock";
import { seedModulesAndPermissions } from "./seeds/modules-permissions";
import { seedSupply } from "./seeds/seed-supply";
import { seedBodega } from "./seeds/seed-bodega";

const prisma = new PrismaClient();

async function main() {
  // Detectar modo Mock via argumentos o ENV
  const args = process.argv.slice(2);
  const isMockMode = args.includes("--mock") || process.env.SEED_MOCK === "true";

  console.log(`🌱 Iniciando Seed Modular [Modo: ${isMockMode ? "MOCK (Completo)" : "CORE (Producción)"}]`);

  try {
    // 1. Core (Siempre se ejecuta)
    await cleanup(prisma);
    const roles = await seedRoles(prisma);
    const catalog = await seedCatalog(prisma);
    const adminUser = await seedAdmin(prisma, roles["ADMIN"].id);
    await seedSettings(prisma, adminUser.id);
    await seedEmailTemplates(prisma, adminUser.id);
    await seedModulesAndPermissions(prisma);
    await seedMantencion(prisma);
    await seedActividades(prisma);
    await seedSupply(prisma);
    await seedBodega(prisma);

    // 3. Asignar todos los permisos al admin al finalizar
    console.log("🔐 Asignando todos los permisos de todos los módulos al usuario admin...");
    const allPermissions = await prisma.modulePermission.findMany({
      include: { module: true }
    });
    
    // Limpiar permisos previos para evitar duplicados en re-seeds
    await prisma.userModulePermission.deleteMany({ where: { userId: adminUser.id } });
    
    await prisma.userModulePermission.createMany({
      data: allPermissions.map((p) => ({
        userId: adminUser.id,
        moduleId: p.moduleId,
        permissionId: p.id,
        grantedAt: new Date(),
      })),
    });
    console.log(`   ✓ ${allPermissions.length} permisos totales asignados de los módulos: ${[...new Set(allPermissions.map(p => p.module.name))].join(", ")}.`);

    // 2. Mock (Solo si la flag está activa)
    if (isMockMode) {
      await seedMockWorkers(prisma, roles, catalog);
      await seedMantencionMock(prisma);
      await seedActividadesMock(prisma);
    }

    console.log("");
    console.log("✅ SEED FINALIZADO");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 CREDENCIALES ADMIN");
    console.log("   Usuario: desarrollo@sotex.cl");
    console.log("   Pass:    password123");
    if (isMockMode) {
      console.log("👥 MOCK DATA: Cargada");
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (e) {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
