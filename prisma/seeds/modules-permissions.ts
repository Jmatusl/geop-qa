/**
 * Seed: Módulos y Permisos del Sistema
 * 
 * Puebla las tablas del sistema centralizado de permisos:
 * - modules
 * - module_permissions
 * - module_notification_settings
 * - module_approval_rules
 * 
 * Ejecutar: npx tsx prisma/seeds/modules-permissions.ts
 */

import { PrismaClient } from "@prisma/client";

/**
 * Función exportable para seed de módulos y permisos
 * Puede ser llamada desde el seed principal o ejecutada standalone
 */
export async function seedModulesAndPermissions(prismaClient: PrismaClient) {
  console.log("📦 Seeding Módulos y Permisos del Sistema...");

  // ============================================
  // 1. CREAR MÓDULOS
  // ============================================

  const actividades = await prismaClient.module.upsert({
    where: { code: "actividades" },
    create: {
      code: "actividades",
      name: "Actividades",
      description: "Gestión de requerimientos y actividades operativas",
      icon: "ClipboardList",
      isActive: true,
      emailEnabled: true,
      displayOrder: 1,
    },
    update: {
      emailEnabled: true, // Asegurar que esté habilitado
    },
  });

  const mantencion = await prismaClient.module.upsert({
    where: { code: "mantencion" },
    create: {
      code: "mantencion",
      name: "Mantención",
      description: "Sistema de mantención preventiva y correctiva",
      icon: "Wrench",
      isActive: true,
      emailEnabled: true,
      displayOrder: 2,
    },
    update: {
      emailEnabled: true, // Asegurar que esté habilitado
    },
  });

  const inventario = await prismaClient.module.upsert({
    where: { code: "inventario" },
    create: {
      code: "inventario",
      name: "Inventario",
      description: "Control de stock y movimientos de inventario",
      icon: "Package",
      isActive: false, // Inactivo inicialmente
      emailEnabled: false, // Inactivo, notificaciones deshabilitadas
      displayOrder: 3,
    },
    update: {},
  });

  const reportes = await prismaClient.module.upsert({
    where: { code: "reportes" },
    create: {
      code: "reportes",
      name: "Reportes",
      description: "Generación de reportes y análisis",
      icon: "FileText",
      isActive: false, // Inactivo inicialmente
      emailEnabled: false, // Inactivo, notificaciones deshabilitadas
      displayOrder: 4,
    },
    update: {},
  });

  // ============================================
  // 2. PERMISOS DE ACTIVIDADES
  // ============================================

  const actPermissions = [
    {
      moduleId: actividades.id,
      code: "autoriza",
      name: "Autorizar Actividades",
      description: "Permite al usuario autorizar actividades y requerimientos",
      category: "approval",
      displayOrder: 1,
    },
    {
      moduleId: actividades.id,
      code: "chequea",
      name: "Chequear Actividades",
      description: "Puede realizar chequeos de actividades antes de la aprobación",
      category: "operation",
      displayOrder: 2,
    },
    {
      moduleId: actividades.id,
      code: "revisa",
      name: "Revisar Requerimientos",
      description: "Puede aprobar revisiones solicitadas por otros usuarios",
      category: "approval",
      displayOrder: 3,
    },
    {
      moduleId: actividades.id,
      code: "recepciona",
      name: "Recepcionar Requerimientos",
      description: "Puede registrar recepciones de trabajo en requerimientos",
      category: "operation",
      displayOrder: 4,
    },
  ];

  for (const perm of actPermissions) {
    await prismaClient.modulePermission.upsert({
      where: {
        moduleId_code: {
          moduleId: perm.moduleId,
          code: perm.code,
        },
      },
      create: perm,
      update: {},
    });
  }

  // ============================================
  // 3. PERMISOS DE MANTENCIÓN
  // ============================================

  const mntPermissions = [
    {
      moduleId: mantencion.id,
      code: "aprueba",
      name: "Aprobar Requerimientos",
      description: "Autoriza requerimientos de mantención",
      category: "approval",
      displayOrder: 1,
    },
    {
      moduleId: mantencion.id,
      code: "aprobacion_cruzada",
      name: "Aprobación Cruzada",
      description: "Puede aprobar requerimientos de otras instalaciones",
      category: "approval",
      displayOrder: 2,
    },
    {
      moduleId: mantencion.id,
      code: "cierra_tecnicamente",
      name: "Cierre Técnico",
      description: "Puede realizar el cierre técnico de requerimientos",
      category: "operation",
      displayOrder: 3,
    },
    {
      moduleId: mantencion.id,
      code: "gestiona_proveedores",
      name: "Gestionar Proveedores",
      description: "Puede administrar la información de proveedores",
      category: "admin",
      displayOrder: 4,
    },
  ];

  for (const perm of mntPermissions) {
    await prismaClient.modulePermission.upsert({
      where: {
        moduleId_code: {
          moduleId: perm.moduleId,
          code: perm.code,
        },
      },
      create: perm,
      update: {},
    });
  }

  // ============================================
  // 4. NOTIFICACIONES DE ACTIVIDADES
  // ============================================

  const actNotifications = [
    {
      moduleId: actividades.id,
      eventKey: "onNewRequest",
      eventName: "Nuevo Requerimiento",
      description: "Notificar a responsables cuando se registre un nuevo requerimiento",
      isEnabled: true,
      requiredPermissions: ["autoriza", "chequea", "revisa"],
    },
    {
      moduleId: actividades.id,
      eventKey: "onAssign",
      eventName: "Asignación de Responsable",
      description: "Avisar al responsable asignado",
      isEnabled: true,
      requiredPermissions: ["autoriza", "chequea"],
    },
    {
      moduleId: actividades.id,
      eventKey: "onStatusChange",
      eventName: "Cambio de Estado",
      description: "Informar al solicitante sobre cambios de estado",
      isEnabled: true,
      requiredPermissions: ["autoriza", "chequea", "revisa"],
    },
    {
      moduleId: actividades.id,
      eventKey: "onComplete",
      eventName: "Completado",
      description: "Notificar al solicitante cuando el requerimiento sea completado",
      isEnabled: true,
      requiredPermissions: ["recepciona"],
    },
  ];

  for (const notif of actNotifications) {
    await prismaClient.moduleNotificationSetting.upsert({
      where: {
        moduleId_eventKey: {
          moduleId: notif.moduleId,
          eventKey: notif.eventKey,
        },
      },
      create: notif,
      update: {
        requiredPermissions: notif.requiredPermissions,
      },
    });
  }

  // ============================================
  // 5. NOTIFICACIONES DE MANTENCIÓN
  // ============================================

  const mntNotifications = [
    {
      moduleId: mantencion.id,
      eventKey: "onNewRequest",
      eventName: "Nuevo Requerimiento",
      description: "Notificar a los aprobadores cuando se registre una nueva falla",
      isEnabled: true,
      requiredPermissions: ["aprueba", "aprobacion_cruzada"],
    },
    {
      moduleId: mantencion.id,
      eventKey: "onApproval",
      eventName: "Aprobaciones y Rechazos",
      description: "Informar al solicitante sobre la decisión de la jefatura",
      isEnabled: true,
      requiredPermissions: ["aprueba", "aprobacion_cruzada"],
    },
    {
      moduleId: mantencion.id,
      eventKey: "onReprogram",
      eventName: "Cambios de Estado y Reprogramación",
      description: "Avisar si un trabajo se terceriza o se cambia la fecha estimada",
      isEnabled: true,
      requiredPermissions: ["aprueba", "gestiona_proveedores"],
    },
    {
      moduleId: mantencion.id,
      eventKey: "onClose",
      eventName: "Cierre Técnico",
      description: "Enviar el informe PDF automáticamente al finalizar el requerimiento",
      isEnabled: true,
      requiredPermissions: ["cierra_tecnicamente"],
    },
  ];

  for (const notif of mntNotifications) {
    await prismaClient.moduleNotificationSetting.upsert({
      where: {
        moduleId_eventKey: {
          moduleId: notif.moduleId,
          eventKey: notif.eventKey,
        },
      },
      create: notif,
      update: {
        requiredPermissions: notif.requiredPermissions,
      },
    });
  }

  // ============================================
  // 6. REGLAS DE APROBACIÓN
  // ============================================

  // Regla de Auto-Aprobación para Mantención
  await prismaClient.moduleApprovalRule.upsert({
    where: {
      moduleId_ruleKey: {
        moduleId: mantencion.id,
        ruleKey: "autoApproval",
      },
    },
    create: {
      moduleId: mantencion.id,
      ruleKey: "autoApproval",
      ruleName: "Auto-Aprobación",
      description: "Omitir el paso por la bandeja de pendientes para solicitudes menores",
      isEnabled: false,
      configuration: {
        autoApprovalTypes: [],
      },
    },
    update: {},
  });

  // Regla de Aprobación Cruzada para Mantención
  await prismaClient.moduleApprovalRule.upsert({
    where: {
      moduleId_ruleKey: {
        moduleId: mantencion.id,
        ruleKey: "crossApproval",
      },
    },
    create: {
      moduleId: mantencion.id,
      ruleKey: "crossApproval",
      ruleName: "Aprobación Cruzada",
      description: "Permite la asignación de validadores inter-instalación",
      isEnabled: false,
      configuration: {
        crossApprovers: [],
      },
    },
    update: {},
  });

  const totalModules = await prismaClient.module.count();
  const totalPermissions = await prismaClient.modulePermission.count();
  const totalNotifications = await prismaClient.moduleNotificationSetting.count();
  const totalRules = await prismaClient.moduleApprovalRule.count();

  console.log(`   ✓ ${totalModules} módulos, ${totalPermissions} permisos, ${totalNotifications} notificaciones, ${totalRules} reglas`);
}

// ============================================
// EJECUCIÓN STANDALONE
// ============================================
// Solo ejecuta si se llama directamente, no al importar
if (require.main === module) {
  const prisma = new PrismaClient();

  async function main() {
    console.log("🌱 Iniciando seed de Módulos y Permisos...\n");
    
    await seedModulesAndPermissions(prisma);
    
    console.log("\n✨ Seed completado exitosamente!");
  }

  main()
    .catch((e) => {
      console.error("❌ Error ejecutando seed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
