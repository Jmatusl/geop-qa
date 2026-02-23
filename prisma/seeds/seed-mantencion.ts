import { PrismaClient } from "@prisma/client";

export async function seedMantencion(prisma: PrismaClient) {
  console.log("🌱 Ejecutando seed del Módulo de Mantenimiento...");

  // 1. Tipos de Requerimiento
  const requestTypes = [
    { name: "Carena", description: "Mantención mayor estructural y de casco." },
    { name: "Mantención Correctiva", description: "Reparación de fallas no planificadas." },
    { name: "Mantención Preventiva", description: "Revisiones rutinarias planificadas." },
    { name: "Mantención Programada", description: "Trabajos agendados por horas de uso." },
    { name: "Overhaul", description: "Desarme y reconstrucción completa." },
    { name: "Solicitud de materiales", description: "Requerimientos exclusivos de insumos." },
  ];

  console.log("Insertando Tipos de Requerimiento...");
  for (const type of requestTypes) {
    await prisma.mntRequestType.upsert({
      where: { name: type.name },
      update: {},
      create: type,
    });
  }

  // 2. Estados de Requerimiento
  const requestStatuses = [
    { name: "Pendiente", description: "Recién ingresado, a la espera de aprobación.", colorHex: "#FBBF24", cssClass: "badge-warning", displayOrder: 1 },
    { name: "Aprobado", description: "Aprobado por jefatura, a la espera de ejecución.", colorHex: "#3B82F6", cssClass: "badge-info", displayOrder: 2 },
    { name: "En Proceso", description: "Trabajo técnico en curso.", colorHex: "#8B5CF6", cssClass: "badge-primary", displayOrder: 3 },
    { name: "Tercerizar", description: "Asignado a un tercero para reparación externa.", colorHex: "#EC4899", cssClass: "badge-secondary", displayOrder: 4 },
    { name: "Finalizado", description: "Trabajo concluido.", colorHex: "#10B981", cssClass: "badge-success", displayOrder: 5 },
    { name: "Rechazado", description: "Requerimiento denegado por jefatura operativa.", colorHex: "#EF4444", cssClass: "badge-danger", displayOrder: 6 },
  ];

  console.log("Insertando Estados de Requerimiento...");
  for (const status of requestStatuses) {
    await prisma.mntRequestStatus.upsert({
      where: { name: status.name },
      update: {},
      create: status,
    });
  }

  // 3. Categorías de Insumos (Opcional, básicas)
  const categories = [
    { name: "Repuestos", description: "Piezas reemplazables." },
    { name: "Herramientas", description: "Útiles de trabajo." },
    { name: "Consumibles", description: "Lubricantes, paños, etc." },
  ];

  console.log("Insertando Categorías de Insumos...");
  for (const cat of categories) {
    await prisma.mntSupplyCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  console.log("✅ Seed de Mantenimiento completado.");
}
