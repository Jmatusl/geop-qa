import { PrismaClient } from "@prisma/client";

export async function seedActividades(prisma: PrismaClient) {
  console.log("  🗂️  Seeding Requerimientos - Actividades (catálogos, configuración + menú)...");

  // --- Tipos de Actividad ---
  const tiposActividad = [
    { name: "Mantenimiento Preventivo", code: "MP", description: "Acciones programadas para prevenir fallas." },
    { name: "Correctivo", code: "COR", description: "Reparación de fallas o averías detectadas." },
    { name: "Instalación", code: "INST", description: "Instalación de equipos o componentes nuevos." },
    { name: "Verificación", code: "VER", description: "Inspección o verificación de funcionamiento." },
    { name: "Limpieza", code: "LIM", description: "Limpieza técnica de equipos o instalaciones." },
  ];

  for (const tipo of tiposActividad) {
    await prisma.actActivityType.upsert({
      where: { code: tipo.code },
      update: { name: tipo.name, description: tipo.description },
      create: tipo,
    });
  }
  console.log("    ✓ Tipos de actividad");

  // --- Prioridades ---
  const prioridades = [
    { name: "Baja", code: "BAJA", colorHex: "#9CA3AF", displayOrder: 1 },
    { name: "Media", code: "MEDIA", colorHex: "#F59E0B", displayOrder: 2 },
    { name: "Alta", code: "ALTA", colorHex: "#EF4444", displayOrder: 3 },
    { name: "Crítica", code: "CRIT", colorHex: "#B91C1C", displayOrder: 4 },
  ];

  for (const p of prioridades) {
    await prisma.actPriority.upsert({
      where: { code: p.code },
      update: { name: p.name, colorHex: p.colorHex, displayOrder: p.displayOrder },
      create: p,
    });
  }
  console.log("    ✓ Prioridades");

  // --- Estados de Requerimiento ---
  const estados = [
    { name: "Pendiente", code: "PEN", colorHex: "#9CA3AF", displayOrder: 1 },
    { name: "Asignado", code: "ASG", colorHex: "#F97316", displayOrder: 2 },
    { name: "En Progreso", code: "EP", colorHex: "#3B82F6", displayOrder: 3 },
    { name: "Aprobado", code: "APROB", colorHex: "#10B981", displayOrder: 4 },
    { name: "En Recepción", code: "EN_RECEP", colorHex: "#8B5CF6", displayOrder: 5 },
    { name: "Recepción Parcial", code: "REC_PARCIAL", colorHex: "#F59E0B", displayOrder: 6 },
    { name: "Finalizado", code: "FINALIZADO", colorHex: "#22C55E", displayOrder: 7 },
    { name: "Completado", code: "CMP", colorHex: "#22C55E", displayOrder: 8 },
    { name: "Cancelado", code: "CAN", colorHex: "#EF4444", displayOrder: 9 },
  ];

  for (const e of estados) {
    await prisma.actStatusReq.upsert({
      where: { code: e.code },
      update: { name: e.name, colorHex: e.colorHex, displayOrder: e.displayOrder },
      create: e,
    });
  }
  console.log("    ✓ Estados de requerimiento");

  // --- Estados de Actividad ---
  const estadosActividad = [
    { name: "Pendiente", code: "PEN", colorHex: "#9CA3AF", displayOrder: 1 },
    { name: "En Progreso", code: "EP", colorHex: "#3B82F6", displayOrder: 2 },
    { name: "Completada", code: "COMP", colorHex: "#10B981", displayOrder: 3 },
    { name: "Recepcionada", code: "RECEP", colorHex: "#22C55E", displayOrder: 4 },
    { name: "Cancelada", code: "CAN", colorHex: "#EF4444", displayOrder: 5 },
  ];

  for (const e of estadosActividad) {
    await prisma.actStatusAct.upsert({
      where: { code: e.code },
      update: { name: e.name, colorHex: e.colorHex, displayOrder: e.displayOrder },
      create: e,
    });
  }
  console.log("    ✓ Estados de actividad");

  // --- Configuración del Módulo ---
  // Obtener usuario admin para asignarle permisos completos
  const adminUser = await prisma.user.findFirst({
    where: { email: "desarrollo@sotex.cl", isActive: true },
    select: { id: true },
  });

  // Reglas del sistema
  await prisma.appSetting.upsert({
    where: { key: "act_system_rules" },
    update: {
      value: {
        folioPrefix: "REQ",
        autoAssign: false,
        storageProvider: "R2",
      },
    },
    create: {
      key: "act_system_rules",
      description: "Reglas y configuración general del módulo de actividades",
      value: {
        folioPrefix: "REQ",
        autoAssign: false,
        storageProvider: "R2",
      },
      isActive: true,
    },
  });

  // Configuración de notificaciones (todas desactivadas por defecto)
  await prisma.appSetting.upsert({
    where: { key: "act_notification_rules" },
    update: {
      value: {
        emailEnabled: false,
        onNewRequest: false,
        onAssign: false,
        onStatusChange: false,
        onComplete: false,
      },
    },
    create: {
      key: "act_notification_rules",
      description: "Configuración de notificaciones del módulo de actividades",
      value: {
        emailEnabled: false,
        onNewRequest: false,
        onAssign: false,
        onStatusChange: false,
        onComplete: false,
      },
      isActive: true,
    },
  });

  console.log("    ✓ Configuración del módulo (reglas, notificaciones)");

  // --- Menú del Módulo ---
  // El menú padre "actividades" con sus hijos se registra mediante upsert
  const existingParent = await prisma.menuItem.findUnique({ where: { key: "actividades" } });

  let parentId: string;
  if (existingParent) {
    parentId = existingParent.id;
  } else {
    const parent = await prisma.menuItem.create({
      data: {
        key: "actividades",
        title: "Actividades",
        icon: "ClipboardList",
        path: "/actividades",
        enabled: true,
        order: 30,
        showIcon: true,
        roles: ["ADMIN", "SUPERVISOR", "OPERADOR", "USUARIO"],
      },
    });
    parentId = parent.id;
    console.log("    ✓ Menú padre 'actividades' creado");
  }

  const hijos = [
    { key: "actividades-listado", title: "Listado", icon: "List", path: "/actividades/listado", order: 10, roles: ["ADMIN", "SUPERVISOR", "OPERADOR", "USUARIO"] },
    { key: "actividades-ingreso", title: "Nuevo", icon: "PlusCircle", path: "/actividades/ingreso", order: 20, roles: ["ADMIN", "SUPERVISOR", "OPERADOR"] },
    { key: "actividades-configuracion", title: "Configuración", icon: "Sliders", path: "/actividades/configuracion/sistema", order: 30, roles: ["ADMIN"] },
  ];

  for (const hijo of hijos) {
    const existing = await prisma.menuItem.findUnique({ where: { key: hijo.key } });
    if (!existing) {
      await prisma.menuItem.create({
        data: {
          key: hijo.key,
          title: hijo.title,
          icon: hijo.icon,
          path: hijo.path,
          enabled: true,
          order: hijo.order,
          showIcon: true,
          roles: hijo.roles,
          parentId: parentId,
        },
      });
    }
  }
  console.log("    ✓ Submenús de actividades");

  console.log("  ✅ Catálogos y menú del módulo Actividades listos");
}
