/**
 * Seed: Estados de Cotizaciones
 * Archivo: prisma/seeds/supply-quotation-status.seed.ts
 * 
 * Descripción: Define los estados del ciclo de vida de una Cotización.
 * Estados: PENDIENTE, ENVIADA, RECIBIDA, NO_COTIZADO, APROBADA, RECHAZADA
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedQuotationStatuses() {
  console.log('🔄 Sembrando estados de cotizaciones...');

  const statuses = [
    {
      code: 'PENDIENTE',
      name: 'Pendiente',
      description: 'Cotización creada pero no enviada al proveedor',
      color: 'slate',
      icon: 'Clock',
      displayOrder: 1,
    },
    {
      code: 'ENVIADA',
      name: 'Enviada',
      description: 'Cotización enviada al proveedor esperando respuesta',
      color: 'blue',
      icon: 'Send',
      displayOrder: 2,
    },
    {
      code: 'RECIBIDA',
      name: 'Recibida',
      description: 'Cotización respondida por el proveedor',
      color: 'cyan',
      icon: 'Inbox',
      displayOrder: 3,
    },
    {
      code: 'NO_COTIZADO',
      name: 'No Cotizado',
      description: 'Proveedor no pudo cotizar estos items',
      color: 'gray',
      icon: 'AlertTriangle',
      displayOrder: 4,
    },
    {
      code: 'APROBADA',
      name: 'Aprobada',
      description: 'Cotización aprobada para orden de compra',
      color: 'emerald',
      icon: 'CheckCircle',
      displayOrder: 5,
    },
    {
      code: 'RECHAZADA',
      name: 'Rechazada',
      description: 'Cotización rechazada (precio alto, plazo, etc.)',
      color: 'red',
      icon: 'XCircle',
      displayOrder: 6,
    },
    {
      code: 'CANCELADA',
      name: 'Cancelada',
      description: 'Cancelada automáticamente por aprobación de otra cotización',
      color: 'orange',
      icon: 'AlertCircle',
      displayOrder: 7,
    },
  ];

  let createdCount = 0;
  let skippedCount = 0;

  for (const status of statuses) {
    const existing = await prisma.quotationStatusMaster.findUnique({
      where: { code: status.code },
    });

    if (!existing) {
      await prisma.quotationStatusMaster.create({
        data: status,
      });
      createdCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`✅ Estados de Cotización: ${createdCount} creados, ${skippedCount} ya existían`);
}

// Ejecutar directamente si se llama como script
if (require.main === module) {
  seedQuotationStatuses()
    .catch((e) => {
      console.error('❌ Error sembrando estados de cotización:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
