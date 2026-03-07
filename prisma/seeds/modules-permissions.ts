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
      emailEnabled: false,
      displayOrder: 1,
    },
    update: {
      emailEnabled: false, 
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
      emailEnabled: false,
      displayOrder: 2,
    },
    update: {
      emailEnabled: false, 
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

  const insumos = await prismaClient.module.upsert({
    where: { code: "insumos" },
    create: {
      code: "insumos",
      name: "Solicitud de Insumos",
      description: "Gestión de solicitudes de insumos, cotizaciones y compras",
      icon: "ShoppingCart",
      isActive: true,
      emailEnabled: false,
      displayOrder: 4,
    },
    update: {
      emailEnabled: false,
    },
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
      displayOrder: 5,
    },
    update: {},
  });

  const bodega = await prismaClient.module.upsert({
    where: { code: "bodega" },
    create: {
      code: "bodega",
      name: "Bodega",
      description: "Gestión de stock, movimientos e inventario",
      icon: "Warehouse",
      isActive: true,
      emailEnabled: false,
      displayOrder: 6,
    },
    update: {
      emailEnabled: false,
    },
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
  // 4. PERMISOS DE INSUMOS
  // ============================================

  const insumosPermissions = [
    {
      moduleId: insumos.id,
      code: "aprobar",
      name: "Aprobar Solicitudes",
      description: "Autoriza solicitudes de insumos",
      category: "approval",
      displayOrder: 1,
    },
    {
      moduleId: insumos.id,
      code: "gestionar_cotizaciones",
      name: "Gestionar Cotizaciones",
      description: "Puede gestionar cotizaciones de proveedores",
      category: "operation",
      displayOrder: 2,
    },
    {
      moduleId: insumos.id,
      code: "aprobar_cotizaciones",
      name: "Aprobar Cotizaciones",
      description: "Puede aprobar cotizaciones para orden de compra",
      category: "approval",
      displayOrder: 3,
    },
    {
      moduleId: insumos.id,
      code: "autorizar_cotizaciones",
      name: "Autorizar Cotizaciones",
      description: "Puede autorizar cotizaciones aprobadas para compra",
      category: "approval",
      displayOrder: 4,
    },
    {
      moduleId: insumos.id,
      code: "recepcionar_items",
      name: "Recepcionar Items",
      description: "Registra recepción de insumos comprados",
      category: "operation",
      displayOrder: 5,
    },
  ];

  for (const perm of insumosPermissions) {
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

  const bodegaPermissions = [
    {
      moduleId: bodega.id,
      code: "gestiona_solicitudes",
      name: "Gestiona Solicitudes",
      description: "Puede crear y editar solicitudes internas de bodega",
      category: "operation",
      displayOrder: 1,
    },
    {
      moduleId: bodega.id,
      code: "aprueba_solicitudes",
      name: "Aprueba Solicitudes",
      description: "Puede aprobar o rechazar solicitudes de bodega",
      category: "approval",
      displayOrder: 2,
    },
    {
      moduleId: bodega.id,
      code: "retira_items",
      name: "Retira Items (Bodeguero)",
      description: "Puede registrar retiros de artículos en las solicitudes",
      category: "operation",
      displayOrder: 3,
    },
    {
      moduleId: bodega.id,
      code: "administrador_bodega",
      name: "Administrador Bodega",
      description: "Acceso completo al módulo de bodega",
      category: "admin",
      displayOrder: 4,
    },
  ];

  for (const perm of bodegaPermissions) {
    await prismaClient.modulePermission.upsert({
      where: {
        moduleId_code: {
          moduleId: bodega.id,
          code: perm.code,
        },
      },
      create: perm,
      update: {},
    });
  }

  // ============================================
  // 5. NOTIFICACIONES DE ACTIVIDADES
  // ============================================

  const actNotifications = [
    {
      moduleId: actividades.id,
      eventKey: "onNewRequest",
      eventName: "Nuevo Requerimiento",
      description: "Notificar a responsables cuando se registre un nuevo requerimiento",
      isEnabled: false,
      requiredPermissions: ["autoriza", "chequea", "revisa"],
    },
    {
      moduleId: actividades.id,
      eventKey: "onAssign",
      eventName: "Asignación de Responsable",
      description: "Avisar al responsable asignado",
      isEnabled: false,
      requiredPermissions: ["autoriza", "chequea"],
    },
    {
      moduleId: actividades.id,
      eventKey: "onStatusChange",
      eventName: "Cambio de Estado",
      description: "Informar al solicitante sobre cambios de estado",
      isEnabled: false,
      requiredPermissions: ["autoriza", "chequea", "revisa"],
    },
    {
      moduleId: actividades.id,
      eventKey: "onComplete",
      eventName: "Completado",
      description: "Notificar al solicitante cuando el requerimiento sea completado",
      isEnabled: false,
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
      isEnabled: false,
      requiredPermissions: ["aprueba", "aprobacion_cruzada"],
    },
    {
      moduleId: mantencion.id,
      eventKey: "onApproval",
      eventName: "Aprobaciones y Rechazos",
      description: "Informar al solicitante sobre la decisión de la jefatura",
      isEnabled: false,
      requiredPermissions: ["aprueba", "aprobacion_cruzada"],
    },
    {
      moduleId: mantencion.id,
      eventKey: "onReprogram",
      eventName: "Cambios de Estado y Reprogramación",
      description: "Avisar si un trabajo se terceriza o se cambia la fecha estimada",
      isEnabled: false,
      requiredPermissions: ["aprueba", "gestiona_proveedores"],
    },
    {
      moduleId: mantencion.id,
      eventKey: "onClose",
      eventName: "Cierre Técnico",
      description: "Enviar el informe PDF automáticamente al finalizar el requerimiento",
      isEnabled: false,
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

  // ============================================
  // 7. NOTIFICACIONES DE INSUMOS
  // ============================================

  const insumosNotifications = [
    {
      moduleId: insumos.id,
      eventKey: "onNewRequest",
      eventName: "Nueva Solicitud",
      description: "Notificar a los aprobadores cuando se registre una nueva solicitud de insumos",
      isEnabled: false,
      requiredPermissions: ["aprobar"],
    },
    {
      moduleId: insumos.id,
      eventKey: "onApproval",
      eventName: "Aprobación / Rechazo",
      description: "Informar al solicitante sobre la decisión del aprobador",
      isEnabled: false,
      requiredPermissions: ["aprobar"],
    },
    {
      moduleId: insumos.id,
      eventKey: "onQuotation",
      eventName: "Cotización Recibida",
      description: "Avisar cuando se reciba una cotización de proveedor",
      isEnabled: false,
      requiredPermissions: ["gestionar_cotizaciones", "aprobar_cotizaciones", "autorizar_cotizaciones"],
    },
    {
      moduleId: insumos.id,
      eventKey: "onPurchaseAuthorized",
      eventName: "Compra Autorizada",
      description: "Notificar al encargado de compras cuando se autorice una cotización",
      isEnabled: false,
      requiredPermissions: ["gestionar_cotizaciones"],
    },
    {
      moduleId: insumos.id,
      eventKey: "onDelivery",
      eventName: "Recepción de Items",
      description: "Notificar al solicitante cuando sus insumos sean recepcionados",
      isEnabled: false,
      requiredPermissions: ["recepcionar_items"],
    },
  ];

  for (const notif of insumosNotifications) {
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
  // 8. MENÚ DEL MÓDULO DE INSUMOS
  // ============================================

  const existingInsumos = await prismaClient.menuItem.findUnique({ where: { key: "insumos" } });

  let insumosParentId: string;
  if (existingInsumos) {
    insumosParentId = existingInsumos.id;
  } else {
    const insumosParent = await prismaClient.menuItem.create({
      data: {
        key: "insumos",
        title: "Insumos",
        icon: "ShoppingCart",
        path: "/insumos",
        enabled: true,
        order: 40,
        showIcon: true,
        roles: ["ADMIN", "SUPERVISOR", "OPERADOR", "USUARIO"],
      },
    });
    insumosParentId = insumosParent.id;
  }

  const insumosHijos = [
    {
      key: "insumos-listado",
      title: "Listado",
      icon: "List",
      path: "/insumos/listado",
      order: 10,
      roles: ["ADMIN", "SUPERVISOR", "OPERADOR", "USUARIO"],
    },
    {
      key: "insumos-ingreso",
      title: "Nueva Solicitud",
      icon: "PlusCircle",
      path: "/insumos/ingreso",
      order: 20,
      roles: ["ADMIN", "SUPERVISOR", "OPERADOR", "USUARIO"],
    },
    {
      key: "insumos-configuracion",
      title: "Configuración",
      icon: "Sliders",
      path: "/insumos/configuracion",
      order: 30,
      roles: ["ADMIN"],
    },
  ];

  for (const hijo of insumosHijos) {
    const existing = await prismaClient.menuItem.findUnique({ where: { key: hijo.key } });
    if (!existing) {
      await prismaClient.menuItem.create({
        data: {
          key: hijo.key,
          title: hijo.title,
          icon: hijo.icon,
          path: hijo.path,
          enabled: true,
          order: hijo.order,
          showIcon: true,
          roles: hijo.roles,
          parentId: insumosParentId,
        },
      });
    }
  }

  console.log(`   ✓ Menú del módulo Insumos creado/actualizado`);

  const totalModules = await prismaClient.module.count();
  const totalPermissions = await prismaClient.modulePermission.count();
  const totalNotifications = await prismaClient.moduleNotificationSetting.count();
  const totalRules = await prismaClient.moduleApprovalRule.count();
  const totalMenuItems = await prismaClient.menuItem.count();

  console.log(`   ✓ ${totalModules} módulos, ${totalPermissions} permisos, ${totalNotifications} notificaciones, ${totalRules} reglas, ${totalMenuItems} ítems de menú`);
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
