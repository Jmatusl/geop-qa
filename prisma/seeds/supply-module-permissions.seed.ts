/**
 * Seed: Módulo de Insumos - Permisos y Notificaciones
 * Archivo: prisma/seeds/supply-module-permissions.seed.ts
 * 
 * Descripción: Registra el módulo de Solicitud de Insumos en el sistema de permisos centralizado.
 * Incluye:
 * - Registro del módulo en la tabla `modules`
 * - Permisos operativos en `module_permissions`
 * - Configuración de notificaciones en `module_notification_settings`
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSupplyModulePermissions() {
  console.log('🔄 Registrando módulo de Insumos en el sistema de permisos...');

  // 1. Crear o actualizar el módulo
  const insumosModule = await prisma.module.upsert({
    where: { code: 'insumos' },
    create: {
      code: 'insumos',
      name: 'Solicitud de Insumos',
      icon: 'Package',
      isActive: true,
      emailEnabled: true,
      displayOrder: 3,
    },
    update: {
      name: 'Solicitud de Insumos',
      icon: 'Package',
      isActive: true,
    },
  });

  console.log(`✅ Módulo creado/actualizado: ${insumosModule.name} (${insumosModule.id})`);

  // 2. Definir permisos operativos
  const permissions = [
    {
      code: 'crear',
      name: 'Crear Solicitudes',
      description: 'Puede crear nuevas solicitudes de insumos',
      category: 'operation',
    },
    {
      code: 'editar',
      name: 'Editar Solicitudes',
      description: 'Puede editar solicitudes existentes',
      category: 'operation',
    },
    {
      code: 'anular',
      name: 'Anular Solicitudes',
      description: 'Puede anular solicitudes propias',
      category: 'operation',
    },
    {
      code: 'aprobar',
      name: 'Aprobar Solicitudes',
      description: 'Puede aprobar solicitudes de insumos',
      category: 'approval',
    },
    {
      code: 'rechazar',
      name: 'Rechazar Solicitudes',
      description: 'Puede rechazar solicitudes',
      category: 'approval',
    },
    {
      code: 'gestionar_cotizaciones',
      name: 'Gestionar Cotizaciones',
      description: 'Puede crear, enviar y recibir cotizaciones',
      category: 'operation',
    },
    {
      code: 'aprobar_cotizaciones',
      name: 'Aprobar Cotizaciones',
      description: 'Puede aprobar cotizaciones para orden de compra',
      category: 'approval',
    },
    {
      code: 'autorizar_cotizaciones',
      name: 'Autorizar Cotizaciones',
      description: 'Puede autorizar cotizaciones aprobadas para compra',
      category: 'approval',
    },
    {
      code: 'administrar',
      name: 'Administrador del Módulo',
      description: 'Acceso completo a todas las funciones',
      category: 'admin',
    },
  ];

  let permCreatedCount = 0;
  let permSkippedCount = 0;

  for (const perm of permissions) {
    const existing = await prisma.modulePermission.findUnique({
      where: {
        moduleId_code: {
          moduleId: insumosModule.id,
          code: perm.code,
        },
      },
    });

    if (!existing) {
      await prisma.modulePermission.create({
        data: {
          moduleId: insumosModule.id,
          ...perm,
        },
      });
      permCreatedCount++;
    } else {
      permSkippedCount++;
    }
  }

  console.log(`✅ Permisos: ${permCreatedCount} creados, ${permSkippedCount} ya existían`);

  // 3. Configurar notificaciones por evento
  const notifications = [
    {
      eventKey: 'onNewRequest',
      eventName: 'Nueva Solicitud',
      description: 'Se creó una nueva solicitud de insumos',
      isEnabled: true,
      requiredPermissions: ['aprobar', 'gestionar_cotizaciones', 'administrar'],
      template: 'new-supply-request',
    },
    {
      eventKey: 'onRequestApproved',
      eventName: 'Solicitud Aprobada',
      description: 'Una solicitud fue aprobada',
      isEnabled: true,
      requiredPermissions: ['crear', 'gestionar_cotizaciones', 'administrar'],
      template: 'supply-request-approved',
    },
    {
      eventKey: 'onRequestRejected',
      eventName: 'Solicitud Rechazada',
      description: 'Una solicitud fue rechazada',
      isEnabled: true,
      requiredPermissions: ['crear', 'administrar'],
      template: 'supply-request-rejected',
    },
    {
      eventKey: 'onQuotationSent',
      eventName: 'Cotización Enviada',
      description: 'Se envió una cotización a un proveedor',
      isEnabled: true,
      requiredPermissions: ['aprobar_cotizaciones', 'autorizar_cotizaciones', 'administrar'],
      template: 'quotation-requested',
    },
    {
      eventKey: 'onQuotationReceived',
      eventName: 'Cotización Recibida',
      description: 'Se recibió respuesta de un proveedor',
      isEnabled: true,
      requiredPermissions: ['gestionar_cotizaciones', 'aprobar_cotizaciones', 'autorizar_cotizaciones', 'administrar'],
      template: 'quotation-received',
    },
    {
      eventKey: 'onQuotationApproved',
      eventName: 'Cotización Aprobada',
      description: 'Una cotización fue aprobada para orden de compra',
      isEnabled: true,
      requiredPermissions: ['gestionar_cotizaciones', 'administrar'],
      template: 'quotation-approved',
    },
  ];

  let notifCreatedCount = 0;
  let notifSkippedCount = 0;

  for (const notif of notifications) {
    const existing = await prisma.moduleNotificationSetting.findUnique({
      where: {
        moduleId_eventKey: {
          moduleId: insumosModule.id,
          eventKey: notif.eventKey,
        },
      },
    });

    if (!existing) {
      await prisma.moduleNotificationSetting.create({
        data: {
          moduleId: insumosModule.id,
          ...notif,
        },
      });
      notifCreatedCount++;
    } else {
      notifSkippedCount++;
    }
  }

  console.log(`✅ Notificaciones: ${notifCreatedCount} creadas, ${notifSkippedCount} ya existían`);
}

// Ejecutar directamente si se llama como script
if (require.main === module) {
  seedSupplyModulePermissions()
    .catch((e) => {
      console.error('❌ Error registrando permisos del módulo:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
