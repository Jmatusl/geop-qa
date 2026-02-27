/**
 * Seed: Estados de Solicitud de Insumos
 * Archivo: prisma/seeds/supply-request-status.seed.ts
 * 
 * Descripción: Define los estados del flujo de vida de una Solicitud de Insumos.
 * Estados: PENDIENTE, EN_PROCESO, APROBADA, RECHAZADA, ANULADA, FINALIZADA
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedRequestStatuses() {
  console.log('🔄 Sembrando estados de solicitud de insumos...');

  const statuses = [
    {
      code: 'PENDIENTE',
      name: 'Pendiente',
      description: 'Solicitud recién creada, esperando revisión inicial',
      color: 'slate',
      icon: 'Clock',
      displayOrder: 1,
    },
    {
      code: 'EN_PROCESO',
      name: 'En Proceso',
      description: 'Solicitud en proceso de cotización y gestión',
      color: 'blue',
      icon: 'Loader',
      displayOrder: 2,
    },
    {
      code: 'APROBADA',
      name: 'Aprobada',
      description: 'Solicitud aprobada por el responsable',
      color: 'emerald',
      icon: 'CheckCircle',
      displayOrder: 3,
    },
    {
      code: 'PARCIAL',
      name: 'Parcialmente Aprobada',
      description: 'Algunos ítems aprobados, otros en proceso o rechazados',
      color: 'yellow',
      icon: 'Loader',
      displayOrder: 4,
    },
    {
      code: 'RECHAZADA',
      name: 'Rechazada',
      description: 'Solicitud rechazada por algún responsable',
      color: 'red',
      icon: 'XCircle',
      displayOrder: 5,
    },
    {
      code: 'ANULADA',
      name: 'Anulada',
      description: 'Solicitud anulada por el solicitante o administrador',
      color: 'gray',
      icon: 'Ban',
      displayOrder: 6,
    },
    {
      code: 'FINALIZADA',
      name: 'Finalizada',
      description: 'Solicitud completada con todos los insumos entregados',
      color: 'green',
      icon: 'CheckCircle2',
      displayOrder: 7,
    },
  ];

  let createdCount = 0;
  let skippedCount = 0;

  for (const status of statuses) {
    const existing = await prisma.supplyRequestStatusMaster.findUnique({
      where: { code: status.code },
    });

    if (!existing) {
      await prisma.supplyRequestStatusMaster.create({
        data: status,
      });
      createdCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`✅ Estados de Solicitud: ${createdCount} creados, ${skippedCount} ya existían`);
}

// Ejecutar directamente si se llama como script
if (require.main === module) {
  seedRequestStatuses()
    .catch((e) => {
      console.error('❌ Error sembrando estados de solicitud:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
