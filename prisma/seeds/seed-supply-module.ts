/**
 * Seed Principal: Módulo de Solicitud de Insumos
 * Archivo: prisma/seeds/seed-supply-module.ts
 * 
 * Descripción: Orquestador principal que ejecuta todos los seeds del módulo de Solicitud de Insumos.
 * Ejecución: npx ts-node prisma/seeds/seed-supply-module.ts
 * 
 * Orden de ejecución:
 * 1. Maestro de Unidades (26 unidades)
 * 2. Estados de Solicitud (6 estados)
 * 3. Estados de Items (7 estados)
 * 4. Estados de Cotización (6 estados)
 * 
 * Total: 45 registros maestros
 */

import { PrismaClient } from '@prisma/client';
import { seedUnits } from './supply-unit-master.seed';
import { seedRequestStatuses } from './supply-request-status.seed';
import { seedItemStatuses } from './supply-item-status.seed';
import { seedQuotationStatuses } from './supply-quotation-status.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     SEED: Módulo de Solicitud de Insumos            ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    await seedUnits();
    console.log('');

    await seedRequestStatuses();
    console.log('');

    await seedItemStatuses();
    console.log('');

    await seedQuotationStatuses();
    console.log('');

    console.log('╔═════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Seed del módulo de Solicitud de Insumos COMPLETADO    ║');
    console.log('╚═════════════════════════════════════════════════════════════╝');
  } catch (error) {
    console.error('\n❌ Error ejecutando seed del módulo:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
