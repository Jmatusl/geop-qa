/**
 * Script de Migración: Permisos Antiguos → Sistema Normalizado
 * 
 * Migra permisos dispersos en app_setting al nuevo sistema centralizado:
 * - act_user_permissions (JSON) → UserModulePermission
 * - mnt_system_rules.crossApprovers (array) → UserModulePermission + ModuleApprovalRule
 * - Notificaciones → ModuleNotificationSetting (si aplica)
 * 
 * Ejecutar: npx tsx scripts/migrate-permissions-to-normalized.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Iniciando migración de permisos antiguos...\n");

  try {
    // ============================================
    // 1. MIGRAR PERMISOS DE ACTIVIDADES
    // ============================================
    console.log("📦 Migrando permisos de Actividades...");

    const actPermissionsSetting = await prisma.appSetting.findUnique({
      where: { key: "act_user_permissions" },
    });

    if (actPermissionsSetting && Array.isArray(actPermissionsSetting.value)) {
      const permissions = actPermissionsSetting.value as Array<{
        userId: string;
        permissions: string[];
      }>;

      console.log(`   Encontrados ${permissions.length} usuarios con permisos`);

      // Obtener módulo de actividades
      const actModule = await prisma.module.findUnique({
        where: { code: "actividades" },
        include: { permissions: true },
      });

      if (!actModule) {
        console.warn("   ⚠️  Módulo 'actividades' no encontrado. Ejecutar seed primero.");
      } else {
        let migratedCount = 0;
        let skippedCount = 0;

        for (const userPerm of permissions) {
          const { userId, permissions: permCodes } = userPerm;

          // Verificar que el usuario exista
          const userExists = await prisma.user.findUnique({
            where: { id: userId },
          });

          if (!userExists) {
            console.warn(`   ⚠️  Usuario ${userId} no existe, omitiendo`);
            skippedCount++;
            continue;
          }

          // Verificar si ya tiene permisos migrados
          const existingPerms = await prisma.userModulePermission.findMany({
            where: {
              userId,
              moduleId: actModule.id,
            },
          });

          if (existingPerms.length > 0) {
            console.log(`   [Skip] Usuario ${userId} ya tiene permisos migrados`);
            skippedCount++;
            continue;
          }

          // Mapear códigos de permisos a IDs
          const permissionsToGrant = actModule.permissions.filter((p) =>
            permCodes.includes(p.code)
          );

          if (permissionsToGrant.length === 0) {
            console.warn(`   ⚠️  No se encontraron permisos válidos para usuario ${userId}`);
            skippedCount++;
            continue;
          }

          // Crear permisos
          await prisma.$transaction(
            permissionsToGrant.map((perm) =>
              prisma.userModulePermission.create({
                data: {
                  userId,
                  moduleId: actModule.id,
                  permissionId: perm.id,
                  grantedAt: new Date(),
                  grantedBy: null, // Migración automática
                },
              })
            )
          );

          console.log(
            `   ✓ Migrados ${permissionsToGrant.length} permisos para usuario ${userId}`
          );
          migratedCount++;
        }

        console.log(
          `   ${migratedCount} usuarios migrados, ${skippedCount} omitidos\n`
        );
      }
    } else {
      console.log("   No se encontraron permisos antiguos de actividades\n");
    }

    // ============================================
    // 2. MIGRAR APROBACIÓN CRUZADA DE MANTENCIÓN
    // ============================================
    console.log("🔧 Migrando Aprobación Cruzada de Mantención...");

    const mntRulesSetting = await prisma.appSetting.findUnique({
      where: { key: "mnt_system_rules" },
    });

    if (mntRulesSetting && typeof mntRulesSetting.value === "object") {
      const rules = mntRulesSetting.value as any;
      const crossApprovers = Array.isArray(rules.crossApprovers)
        ? rules.crossApprovers
        : [];
      const crossApprovalEnabled = rules.crossApprovalEnabled === true;
      const autoApprovalEnabled = rules.autoApprovalEnabled === true;
      const autoApprovalTypes = Array.isArray(rules.autoApprovalTypes)
        ? rules.autoApprovalTypes
        : [];

      console.log(`   Encontrados ${crossApprovers.length} aprobadores cruzados`);

      // Obtener módulo de mantención
      const mntModule = await prisma.module.findUnique({
        where: { code: "mantencion" },
        include: { permissions: true },
      });

      if (!mntModule) {
        console.warn("   ⚠️  Módulo 'mantencion' no encontrado. Ejecutar seed primero.");
      } else {
        // Obtener permiso de aprobación cruzada
        const crossApprovalPerm = mntModule.permissions.find(
          (p) => p.code === "aprobacion_cruzada"
        );

        if (!crossApprovalPerm) {
          console.warn("   ⚠️  Permiso 'aprobacion_cruzada' no encontrado");
        } else {
          let migratedCount = 0;
          let skippedCount = 0;

          for (const userId of crossApprovers) {
            // Verificar que el usuario exista
            const userExists = await prisma.user.findUnique({
              where: { id: userId },
            });

            if (!userExists) {
              console.warn(`   ⚠️  Usuario ${userId} no existe, omitiendo`);
              skippedCount++;
              continue;
            }

            // Verificar si ya tiene el permiso
            const existingPerm = await prisma.userModulePermission.findUnique({
              where: {
                userId_permissionId: {
                  userId,
                  permissionId: crossApprovalPerm.id,
                },
              },
            });

            if (existingPerm) {
              console.log(
                `   [Skip] Usuario ${userId} ya tiene permiso de aprobación cruzada`
              );
              skippedCount++;
              continue;
            }

            // Otorgar permiso
            await prisma.userModulePermission.create({
              data: {
                userId,
                moduleId: mntModule.id,
                permissionId: crossApprovalPerm.id,
                grantedAt: new Date(),
                grantedBy: null, // Migración automática
              },
            });

            console.log(`   ✓ Permiso otorgado a usuario ${userId}`);
            migratedCount++;
          }

          console.log(
            `   ${migratedCount} permisos otorgados, ${skippedCount} omitidos\n`
          );
        }

        // Actualizar regla de aprobación cruzada
        const crossApprovalRule = await prisma.moduleApprovalRule.findUnique({
          where: {
            moduleId_ruleKey: {
              moduleId: mntModule.id,
              ruleKey: "crossApproval",
            },
          },
        });

        if (crossApprovalRule) {
          await prisma.moduleApprovalRule.update({
            where: { id: crossApprovalRule.id },
            data: {
              isEnabled: crossApprovalEnabled,
              configuration: {
                crossApprovers, // Mantener array original como referencia
              },
            },
          });
          console.log(`   ✓ Regla de aprobación cruzada actualizada (enabled=${crossApprovalEnabled})\n`);
        }

        // Actualizar regla de auto-aprobación
        const autoApprovalRule = await prisma.moduleApprovalRule.findUnique({
          where: {
            moduleId_ruleKey: {
              moduleId: mntModule.id,
              ruleKey: "autoApproval",
            },
          },
        });

        if (autoApprovalRule) {
          await prisma.moduleApprovalRule.update({
            where: { id: autoApprovalRule.id },
            data: {
              isEnabled: autoApprovalEnabled,
              configuration: {
                autoApprovalTypes,
              },
            },
          });
          console.log(`   ✓ Regla de auto-aprobación actualizada (enabled=${autoApprovalEnabled})\n`);
        }
      }
    } else {
      console.log("   No se encontraron reglas antiguas de mantención\n");
    }

    // ============================================
    // 3. VALIDAR MIGRACIÓN
    // ============================================
    console.log("✅ Validando migración...");

    const totalUserPerms = await prisma.userModulePermission.count();
    const totalByModule = await prisma.userModulePermission.groupBy({
      by: ["moduleId"],
      _count: true,
    });

    console.log(`   Total de permisos de usuario: ${totalUserPerms}`);
    for (const group of totalByModule) {
      const module = await prisma.module.findUnique({
        where: { id: group.moduleId },
      });
      console.log(`   - ${module?.name}: ${group._count} permisos`);
    }

    console.log("\n✨ Migración completada exitosamente!");
    console.log("\n📌 Próximos pasos:");
    console.log("   1. Verificar que los permisos se migraron correctamente desde /mantenedores/usuarios");
    console.log("   2. Probar la funcionalidad en Actividades y Mantención");
    console.log("   3. Una vez validado, deprecar las rutas antiguas:");
    console.log("      - /actividades/configuracion/sistema");
    console.log("      - /mantencion/configuracion/sistema");
    console.log("   4. Opcional: Eliminar keys antiguos de app_setting (act_user_permissions, mnt_system_rules.crossApprovers)\n");
  } catch (error) {
    console.error("❌ Error durante la migración:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Error fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
