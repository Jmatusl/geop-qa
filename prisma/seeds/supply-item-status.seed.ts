/**
 * Seed: Estados de Items de Solicitud
 * Archivo: prisma/seeds/supply-item-status.seed.ts
 * 
 * Descripción: Define los estados individuales de cada ítem dentro de una solicitud.
 * Estados: PENDIENTE, COTIZADO, AUTORIZADO, APROBADO, RECHAZADO, ENTREGADO, NO_DISPONIBLE
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedItemStatuses() {
  console.log('🔄 Sembrando estados de items de solicitud...');

  const statuses = [
    {
      code: 'PENDIENTE',
      name: 'Pendiente',
      description: 'Item sin cotizar ni procesar',
      color: 'slate',
      icon: 'Circle',
      displayOrder: 1,
    },
    {
      code: 'COTIZADO',
      name: 'Cotizado',
      description: 'Item incluido en al menos una cotización',
      color: 'blue',
      icon: 'FileText',
      displayOrder: 2,
    },
    {
      code: 'AUTORIZADO',
      name: 'Autorizado',
      description: 'Item autorizado para compra por el supervisor',
      color: 'amber',
      icon: 'Shield',
      displayOrder: 3,
    },
    {
      code: 'APROBADO',
      name: 'Aprobado',
      description: 'Item aprobado por el responsable final',
      color: 'emerald',
      icon: 'CheckSquare',
      displayOrder: 4,
    },
    {
      code: 'RECHAZADO',
      name: 'Rechazado',
      description: 'Item rechazado por algún responsable',
      color: 'red',
      icon: 'XSquare',
      displayOrder: 5,
    },
    {
      code: 'ENTREGADO',
      name: 'Entregado',
      description: 'Item recibido en el lugar de destino',
      color: 'green',
      icon: 'PackageCheck',
      displayOrder: 6,
    },
    {
      code: 'NO_DISPONIBLE',
      name: 'No Disponible',
      description: 'Item no disponible en el mercado o con proveedores',
      color: 'gray',
      icon: 'AlertCircle',
      displayOrder: 7,
    },
  ];

  let createdCount = 0;
  let skippedCount = 0;

  for (const status of statuses) {
    const existing = await prisma.supplyItemStatusMaster.findUnique({
      where: { code: status.code },
    });

    if (!existing) {
      await prisma.supplyItemStatusMaster.create({
        data: status,
      });
      createdCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`✅ Estados de Item: ${createdCount} creados, ${skippedCount} ya existían`);
}

// Ejecutar directamente si se llama como script
if (require.main === module) {
  seedItemStatuses()
    .catch((e) => {
      console.error('❌ Error sembrando estados de items:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
