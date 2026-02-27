/**
 * Seed: Módulo de Solicitud de Insumos (Integrador)
 * Archivo: prisma/seeds/seed-supply.ts
 * 
 * Función integradora que ejecuta todos los seeds del módulo de insumos
 * usando una instancia compartida de PrismaClient para integración con seed.ts principal.
 */

import { PrismaClient } from "@prisma/client";

export async function seedSupply(prismaClient: PrismaClient) {
  console.log("🛒 Seeding Módulo de Solicitud de Insumos...");

  // ============================================
  // 1. UNIDADES DE MEDIDA
  // ============================================
  const units = [
    { code: "KG", name: "Kilogramo", symbol: "kg", category: "mass", conversionFactor: 1, baseUnit: "KG" },
    { code: "G", name: "Gramo", symbol: "g", category: "mass", conversionFactor: 0.001, baseUnit: "KG" },
    { code: "T", name: "Tonelada", symbol: "t", category: "mass", conversionFactor: 1000, baseUnit: "KG" },
    { code: "LB", name: "Libra", symbol: "lb", category: "mass", conversionFactor: 0.453592, baseUnit: "KG" },
    { code: "L", name: "Litro", symbol: "L", category: "volume", conversionFactor: 1, baseUnit: "L" },
    { code: "ML", name: "Mililitro", symbol: "ml", category: "volume", conversionFactor: 0.001, baseUnit: "L" },
    { code: "M3", name: "Metro cúbico", symbol: "m³", category: "volume", conversionFactor: 1000, baseUnit: "L" },
    { code: "GAL", name: "Galón", symbol: "gal", category: "volume", conversionFactor: 3.78541, baseUnit: "L" },
    { code: "M", name: "Metro", symbol: "m", category: "length", conversionFactor: 1, baseUnit: "M" },
    { code: "CM", name: "Centímetro", symbol: "cm", category: "length", conversionFactor: 0.01, baseUnit: "M" },
    { code: "MM", name: "Milímetro", symbol: "mm", category: "length", conversionFactor: 0.001, baseUnit: "M" },
    { code: "IN", name: "Pulgada", symbol: "in", category: "length", conversionFactor: 0.0254, baseUnit: "M" },
    { code: "FT", name: "Pie", symbol: "ft", category: "length", conversionFactor: 0.3048, baseUnit: "M" },
    { code: "UN", name: "Unidad", symbol: "un", category: "quantity", conversionFactor: null, baseUnit: null },
    { code: "PAR", name: "Par", symbol: "par", category: "quantity", conversionFactor: null, baseUnit: null },
    { code: "DOC", name: "Docena", symbol: "doc", category: "quantity", conversionFactor: null, baseUnit: null },
    { code: "CAJA", name: "Caja", symbol: "caja", category: "quantity", conversionFactor: null, baseUnit: null },
    { code: "SACO", name: "Saco", symbol: "saco", category: "quantity", conversionFactor: null, baseUnit: null },
    { code: "PALET", name: "Palet", symbol: "palet", category: "quantity", conversionFactor: null, baseUnit: null },
    { code: "H", name: "Hora", symbol: "h", category: "time", conversionFactor: 1, baseUnit: "H" },
    { code: "MIN", name: "Minuto", symbol: "min", category: "time", conversionFactor: 0.0166667, baseUnit: "H" },
    { code: "DIA", name: "Día", symbol: "día", category: "time", conversionFactor: 24, baseUnit: "H" },
    { code: "M2", name: "Metro cuadrado", symbol: "m²", category: "area", conversionFactor: 1, baseUnit: "M2" },
    { code: "HA", name: "Hectárea", symbol: "ha", category: "area", conversionFactor: 10000, baseUnit: "M2" },
  ];

  let unitsCreated = 0;
  for (const unit of units) {
    const existing = await prismaClient.unitMaster.findUnique({ where: { code: unit.code } });
    if (!existing) {
      await prismaClient.unitMaster.create({
        data: {
          code: unit.code,
          name: unit.name,
          symbol: unit.symbol,
          category: unit.category,
          conversionFactor: unit.conversionFactor,
          baseUnit: unit.baseUnit,
          isActive: true,
        },
      });
      unitsCreated++;
    }
  }
  console.log(`   ✓ Unidades de medida: ${unitsCreated} creadas`);

  // ============================================
  // 2. ESTADOS DE SOLICITUD
  // ============================================
  const requestStatuses = [
    { code: "PENDIENTE", name: "Pendiente", description: "Solicitud recién creada, esperando revisión inicial", color: "slate", icon: "Clock", displayOrder: 1 },
    { code: "EN_PROCESO", name: "En Proceso", description: "Solicitud en proceso de cotización y gestión", color: "blue", icon: "Loader", displayOrder: 2 },
    { code: "APROBADA", name: "Aprobada", description: "Solicitud aprobada por el responsable", color: "emerald", icon: "CheckCircle", displayOrder: 3 },
    { code: "RECHAZADA", name: "Rechazada", description: "Solicitud rechazada por algún responsable", color: "red", icon: "XCircle", displayOrder: 4 },
    { code: "ANULADA", name: "Anulada", description: "Solicitud anulada por el solicitante o administrador", color: "gray", icon: "Ban", displayOrder: 5 },
    { code: "FINALIZADA", name: "Finalizada", description: "Solicitud completada con todos los insumos entregados", color: "green", icon: "CheckCircle2", displayOrder: 6 },
  ];

  let reqStatusCreated = 0;
  for (const status of requestStatuses) {
    const existing = await prismaClient.supplyRequestStatusMaster.findUnique({ where: { code: status.code } });
    if (!existing) {
      await prismaClient.supplyRequestStatusMaster.create({ data: status });
      reqStatusCreated++;
    }
  }
  console.log(`   ✓ Estados de solicitud: ${reqStatusCreated} creados`);

  // ============================================
  // 3. ESTADOS DE ITEM
  // ============================================
  const itemStatuses = [
    { code: "PENDIENTE", name: "Pendiente", description: "Item pendiente de cotización", color: "slate", icon: "Clock", displayOrder: 1 },
    { code: "COTIZADO", name: "Cotizado", description: "Se recibió cotización del proveedor", color: "blue", icon: "FileText", displayOrder: 2 },
    { code: "AUTORIZADO", name: "Autorizado", description: "Cotización autorizada para compra", color: "emerald", icon: "CheckCircle", displayOrder: 3 },
    { code: "EN_COMPRA", name: "En Compra", description: "Orden de compra en proceso", color: "purple", icon: "ShoppingCart", displayOrder: 4 },
    { code: "RECIBIDO", name: "Recibido", description: "Item recibido en bodega", color: "green", icon: "PackageCheck", displayOrder: 5 },
    { code: "RECHAZADO", name: "Rechazado", description: "Item rechazado o no disponible", color: "red", icon: "XCircle", displayOrder: 6 },
    { code: "ANULADO", name: "Anulado", description: "Item anulado por el solicitante", color: "gray", icon: "Ban", displayOrder: 7 },
  ];

  let itemStatusCreated = 0;
  for (const status of itemStatuses) {
    const existing = await prismaClient.supplyItemStatusMaster.findUnique({ where: { code: status.code } });
    if (!existing) {
      await prismaClient.supplyItemStatusMaster.create({ data: status });
      itemStatusCreated++;
    }
  }
  console.log(`   ✓ Estados de item: ${itemStatusCreated} creados`);

  // ============================================
  // 4. ESTADOS DE COTIZACIÓN
  // ============================================
  const quotationStatuses = [
    { code: "BORRADOR", name: "Borrador", description: "Cotización en preparación", color: "gray", icon: "FileEdit", displayOrder: 1 },
    { code: "ENVIADA", name: "Enviada", description: "Cotización enviada al proveedor", color: "blue", icon: "Send", displayOrder: 2 },
    { code: "RECIBIDA", name: "Recibida", description: "Respuesta del proveedor recibida", color: "purple", icon: "Inbox", displayOrder: 3 },
    { code: "APROBADA", name: "Aprobada", description: "Cotización aprobada para compra", color: "emerald", icon: "CheckCircle", displayOrder: 4 },
    { code: "RECHAZADA", name: "Rechazada", description: "Cotización rechazada", color: "red", icon: "XCircle", displayOrder: 5 },
    { code: "VENCIDA", name: "Vencida", description: "Cotización vencida por tiempo", color: "orange", icon: "AlertCircle", displayOrder: 6 },
  ];

  let quotStatusCreated = 0;
  for (const status of quotationStatuses) {
    const existing = await prismaClient.quotationStatusMaster.findUnique({ where: { code: status.code } });
    if (!existing) {
      await prismaClient.quotationStatusMaster.create({ data: status });
      quotStatusCreated++;
    }
  }
  console.log(`   ✓ Estados de cotización: ${quotStatusCreated} creados`);

  // ============================================
  // 5. CATEGORÍAS DE INSUMOS (básicas del módulo supply)
  // ============================================
  const supplyCategories = [
    { name: "Aceites y Lubricantes", description: "Aceites, grasas y lubricantes industriales" },
    { name: "Elementos de Protección Personal", description: "EPP y equipos de seguridad" },
    { name: "Equipos y Maquinaria", description: "Equipos menores y maquinaria de trabajo" },
    { name: "Ferretería y Fijaciones", description: "Tornillos, pernos, tuercas, arandelas y fijaciones" },
    { name: "Herramientas Manuales", description: "Herramientas de mano y trabajo manual" },
    { name: "Herramientas Eléctricas", description: "Herramientas eléctricas y neumáticas" },
    { name: "Insumos de Limpieza", description: "Productos de limpieza, desengrasantes y paños" },
    { name: "Materiales Eléctricos", description: "Cables, breakers, fusibles y materiales eléctricos" },
    { name: "Materiales de Construcción", description: "Cemento, arena, áridos y materiales de obra" },
    { name: "Pintura y Revestimientos", description: "Pinturas, primers, esmaltes y revestimientos" },
    { name: "Repuestos Mecánicos", description: "Repuestos para maquinaria y equipos mecánicos" },
    { name: "Sellantes y Adhesivos", description: "Sellantes, adhesivos, teflón y cintas" },
    { name: "Tuberías y Accesorios", description: "Tuberías, codos, válvulas y accesorios de plomería" },
    { name: "Otros Insumos", description: "Insumos que no corresponden a las categorías anteriores" },
  ];

  let catCreated = 0;
  for (const cat of supplyCategories) {
    const existing = await prismaClient.mntSupplyCategory.findUnique({ where: { name: cat.name } });
    if (!existing) {
      await prismaClient.mntSupplyCategory.create({
        data: { name: cat.name, description: cat.description, isActive: true },
      });
      catCreated++;
    }
  }
  console.log(`   ✓ Categorías de insumos: ${catCreated} creadas`);

  console.log("  ✅ Módulo de Solicitud de Insumos listo");
}
