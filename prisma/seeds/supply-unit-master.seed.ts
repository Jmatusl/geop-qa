/**
 * Seed: Maestro de Unidades de Medida
 * Archivo: prisma/seeds/supply-unit-master.seed.ts
 * 
 * Descripción: Define las unidades de medida estándar para el módulo de Solicitud de Insumos.
 * Incluye unidades de masa, volumen, longitud, cantidad, tiempo y área.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedUnits() {
  console.log('🔄 Sembrando maestro de unidades de medida...');

  const units = [
    // MASA
    { code: 'KG', name: 'Kilogramo', symbol: 'kg', category: 'mass', conversionFactor: 1, baseUnit: 'KG', description: 'Unidad de masa del SI' },
    { code: 'G', name: 'Gramo', symbol: 'g', category: 'mass', conversionFactor: 0.001, baseUnit: 'KG', description: 'Milésima parte del kilogramo' },
    { code: 'T', name: 'Tonelada', symbol: 't', category: 'mass', conversionFactor: 1000, baseUnit: 'KG', description: 'Equivale a 1000 kilogramos' },
    { code: 'LB', name: 'Libra', symbol: 'lb', category: 'mass', conversionFactor: 0.453592, baseUnit: 'KG', description: 'Unidad de masa anglosajona' },

    // VOLUMEN
    { code: 'L', name: 'Litro', symbol: 'L', category: 'volume', conversionFactor: 1, baseUnit: 'L', description: 'Unidad de volumen métrico' },
    { code: 'ML', name: 'Mililitro', symbol: 'ml', category: 'volume', conversionFactor: 0.001, baseUnit: 'L', description: 'Milésima parte del litro' },
    { code: 'M3', name: 'Metro cúbico', symbol: 'm³', category: 'volume', conversionFactor: 1000, baseUnit: 'L', description: 'Volumen de un cubo de 1 metro de lado' },
    { code: 'CM3', name: 'Centímetro cúbico', symbol: 'cm³', category: 'volume', conversionFactor: 0.001, baseUnit: 'L', description: 'Equivale a 1 mililitro' },
    { code: 'GAL', name: 'Galón', symbol: 'gal', category: 'volume', conversionFactor: 3.78541, baseUnit: 'L', description: 'Galón estadounidense' },

    // LONGITUD
    { code: 'M', name: 'Metro', symbol: 'm', category: 'length', conversionFactor: 1, baseUnit: 'M', description: 'Unidad de longitud del SI' },
    { code: 'CM', name: 'Centímetro', symbol: 'cm', category: 'length', conversionFactor: 0.01, baseUnit: 'M', description: 'Centésima parte del metro' },
    { code: 'MM', name: 'Milímetro', symbol: 'mm', category: 'length', conversionFactor: 0.001, baseUnit: 'M', description: 'Milésima parte del metro' },
    { code: 'KM', name: 'Kilómetro', symbol: 'km', category: 'length', conversionFactor: 1000, baseUnit: 'M', description: 'Equivale a 1000 metros' },
    { code: 'IN', name: 'Pulgada', symbol: 'in', category: 'length', conversionFactor: 0.0254, baseUnit: 'M', description: 'Unidad de longitud anglosajona' },
    { code: 'FT', name: 'Pie', symbol: 'ft', category: 'length', conversionFactor: 0.3048, baseUnit: 'M', description: 'Equivale a 12 pulgadas' },

    // CANTIDAD (Sin conversión, son unidades discretas)
    { code: 'UN', name: 'Unidad', symbol: 'un', category: 'quantity', conversionFactor: null, baseUnit: null, description: 'Unidad discreta' },
    { code: 'PAR', name: 'Par', symbol: 'par', category: 'quantity', conversionFactor: null, baseUnit: null, description: 'Conjunto de dos unidades' },
    { code: 'DOC', name: 'Docena', symbol: 'doc', category: 'quantity', conversionFactor: null, baseUnit: null, description: 'Conjunto de 12 unidades' },
    { code: 'CAJA', name: 'Caja', symbol: 'caja', category: 'quantity', conversionFactor: null, baseUnit: null, description: 'Embalaje estándar' },
    { code: 'SACO', name: 'Saco', symbol: 'saco', category: 'quantity', conversionFactor: null, baseUnit: null, description: 'Embalaje de gran capacidad' },
    { code: 'PALET', name: 'Palet', symbol: 'palet', category: 'quantity', conversionFactor: null, baseUnit: null, description: 'Plataforma de carga' },

    // TIEMPO
    { code: 'H', name: 'Hora', symbol: 'h', category: 'time', conversionFactor: 1, baseUnit: 'H', description: 'Unidad de tiempo' },
    { code: 'MIN', name: 'Minuto', symbol: 'min', category: 'time', conversionFactor: 0.0166667, baseUnit: 'H', description: 'Sexagesima parte de la hora' },
    { code: 'DIA', name: 'Día', symbol: 'día', category: 'time', conversionFactor: 24, baseUnit: 'H', description: 'Equivale a 24 horas' },

    // ÁREA
    { code: 'M2', name: 'Metro cuadrado', symbol: 'm²', category: 'area', conversionFactor: 1, baseUnit: 'M2', description: 'Unidad de área del SI' },
    { code: 'HA', name: 'Hectárea', symbol: 'ha', category: 'area', conversionFactor: 10000, baseUnit: 'M2', description: 'Equivale a 10,000 m²' },
  ];

  let createdCount = 0;
  let skippedCount = 0;

  for (const unit of units) {
    const existing = await prisma.unitMaster.findUnique({
      where: { code: unit.code },
    });

    if (!existing) {
      await prisma.unitMaster.create({
        data: unit,
      });
      createdCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`✅ Unidades: ${createdCount} creadas, ${skippedCount} ya existían`);
}

// Ejecutar directamente si se llama como script
if (require.main === module) {
  seedUnits()
    .catch((e) => {
      console.error('❌ Error sembrando unidades:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
