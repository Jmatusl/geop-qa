import { PrismaClient } from "@prisma/client";
import uiConfigFallback from "../../../lib/config/ui-config-fallback.json";
import mailConfigAuthFallback from "../../../lib/config/mail-config-auth-fallback.json";
import securityFallback from "../../../lib/config/security-fallback.json";

export async function seedSettings(prisma: PrismaClient, adminUserId: string) {
  console.log("⚙️  Sembrando configuraciones y menús...");

  // 1. Configuraciones
  const { REPORT_CONFIG, PERSON_IMAGE_CONFIG, STORAGE_CONFIG, ...uiConfigBase } = uiConfigFallback as any;

  const recoveredSettings = [
    {
      key: "GOOGLE_SSO_CONFIG",
      description: "Configuración de autenticación con Google SSO",
      hasCustomUi: true,
      value: {
        enabled: false,
        client_id: "",
        redirect_uri: "http://localhost:3000/api/v1/auth/google/callback",
        client_secret: "",
      },
    },
    {
      key: "EXPIRATION_CONFIG",
      description: "Tiempos de expiración de tokens y sesiones",
      hasCustomUi: true,
      value: {
        session_idle_minutes: 30,
        activation_token_days: 7,
        session_absolute_hours: 8,
        password_reset_token_hours: 24,
      },
    },
    {
      key: "SECURITY_POLICIES",
      description: "Políticas de seguridad del sistema",
      hasCustomUi: true,
      value: securityFallback.SECURITY_POLICIES,
    },
    {
      key: "SECURITY_MESSAGES",
      description: "Mensajes de alerta para bloqueo de cuenta y límites de sesión",
      hasCustomUi: true,
      value: securityFallback.SECURITY_MESSAGES,
    },
    {
      key: "EMAIL_CONFIG",
      description: "Configuración de correo electrónico y Resend",
      hasCustomUi: true,
      value: {
        enabled: true,
        provider: "resend",
        from_name: "GEOP - Sotex",
        templates: {
          activation: { enabled: true, subject: "Activa tu cuenta" },
          notification: { enabled: true, subject: "Notificación del sistema" },
          password_reset: { enabled: true, subject: "Recuperación de contraseña" },
        },
        from_email: "no-reply@geop.sotex.app",
        resend_api_key: "re_XnZbTdX8_88gEVQUNuPofPUzTbUBvqBBg",
        send_notifications: true,
        show_client_logo: true,
      },
    },
    {
      key: "REPORT_CONFIG",
      description: "Configuración de identidad visual para reportes Excel y PDF",
      hasCustomUi: true,
      value: REPORT_CONFIG,
    },
    {
      key: "PERSON_IMAGE_CONFIG",
      description: "Configuración para la subida de fotos de perfil de trabajadores",
      hasCustomUi: true,
      value: PERSON_IMAGE_CONFIG,
    },
    {
      key: "UI_CONFIG",
      description: "Configuraciones Generales de la UI de sistema",
      hasCustomUi: true,
      value: uiConfigBase,
    },
    {
      key: "MAIL_CONFIG-AUTH",
      description: "Configuración de textos para correos de autenticación",
      hasCustomUi: true,
      value: mailConfigAuthFallback,
    },
    {
      key: "STORAGE_CONFIG",
      description: "Configuración de almacenamiento en la nube (R2)",
      hasCustomUi: true,
      value: STORAGE_CONFIG,
    },
  ];

  for (const setting of recoveredSettings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting,
    });
  }
  console.log("   ✓ Configuraciones creadas");

  // 2. Menús
  const recoveredMenus = [
    {
      key: "dashboard",
      title: "Dashboard",
      icon: "LayoutDashboard",
      path: "/dashboard",
      enabled: true,
      order: 0,
      showIcon: true,
      roles: ["ADMIN", "SUPERVISOR", "OPERADOR", "USUARIO"],
      children: [],
    },
    {
      key: "mis-notificaciones",
      title: "Mis Notificaciones",
      icon: "Bell",
      path: "/perfil/notificaciones",
      enabled: true,
      order: 10,
      showIcon: true,
      roles: ["ADMIN", "SUPERVISOR", "OPERADOR", "USUARIO"],
      children: [],
    },
    {
      key: "mantencion",
      title: "Mantenimiento",
      icon: "Wrench",
      path: "/mantencion",
      enabled: true,
      order: 20,
      showIcon: true,
      roles: ["ADMIN", "SUPERVISOR", "OPERADOR", "USUARIO"],
      children: [
        { key: "mantencion-ingreso", title: "Ingreso", icon: "PlusCircle", path: "/mantencion/ingreso", enabled: true, order: 10, showIcon: true, roles: ["ADMIN", "SUPERVISOR", "OPERADOR"] },
        { key: "mantencion-pendientes", title: "Pendientes", icon: "Clock", path: "/mantencion/pendientes", enabled: true, order: 20, showIcon: true, roles: ["ADMIN", "SUPERVISOR"] },
        {
          key: "mantencion-consolidado",
          title: "Consolidado",
          icon: "LayoutDashboard",
          path: "/mantencion/consolidado",
          enabled: true,
          order: 30,
          showIcon: true,
          roles: ["ADMIN", "SUPERVISOR", "OPERADOR"],
        },
        { key: "mantencion-configuracion", title: "Configuración", icon: "Sliders", path: "/mantencion/configuracion", enabled: true, order: 40, showIcon: true, roles: ["ADMIN"] },
      ],
    },
    {
      key: "maestros",
      title: "Maestros",
      icon: "Database",
      path: null,
      enabled: true,
      order: 40,
      showIcon: true,
      roles: ["ADMIN", "SUPERVISOR", "OPERADOR"],
      children: [
        { key: "maestros-usuarios", title: "Usuarios", icon: "Users", path: "/mantenedores/usuarios", enabled: true, order: 0, showIcon: true, roles: ["ADMIN"] },
        { key: "maestros-notificaciones", title: "Notificaciones", icon: "Bell", path: "/mantenedores/notificaciones", enabled: true, order: 5, showIcon: true, roles: ["ADMIN"] },
        { key: "maestros-roles", title: "Roles", icon: "Shield", path: "/mantenedores/roles", enabled: true, order: 10, showIcon: true, roles: ["ADMIN"] },
        { key: "maestros-personas", title: "Trabajadores", icon: "Contact", path: "/persons", enabled: true, order: 12, showIcon: true, roles: ["ADMIN", "SUPERVISOR", "OPERADOR"] },
        { key: "maestros-cargos", title: "Cargos", icon: "Briefcase", path: "/organization/job-positions", enabled: true, order: 15, showIcon: true, roles: ["ADMIN", "SUPERVISOR"] },
        { key: "maestros-areas", title: "Áreas", icon: "Building", path: "/organization/areas", enabled: true, order: 16, showIcon: true, roles: ["ADMIN", "SUPERVISOR"] },
        { key: "maestros-grupos", title: "Grupos de Trabajo", icon: "MapPin", path: "/organization/work-groups", enabled: true, order: 17, showIcon: true, roles: ["ADMIN", "SUPERVISOR"] },
        { key: "maestros-firmas", title: "Firmas", icon: "FileSignature", path: "/mantenedores/firmas", enabled: true, order: 18, showIcon: true, roles: ["ADMIN"] },
        { key: "maestros-configuraciones", title: "Configuraciones", icon: "Settings", path: "/mantenedores/configuraciones", enabled: true, order: 20, showIcon: true, roles: ["ADMIN"] },
        { key: "maestros-menus", title: "Menús", icon: "Menu", path: "/mantenedores/menus", enabled: true, order: 30, showIcon: true, roles: ["ADMIN"] },
        { key: "maestros-email-templates", title: "Plantillas de Correo", icon: "Mail", path: "/mantenedores/email-templates", enabled: true, order: 36, showIcon: true, roles: ["ADMIN"] },
      ],
    },
    {
      key: "audit",
      title: "Auditoría",
      icon: "FileText",
      path: "/auditoria",
      enabled: true,
      order: 50,
      showIcon: true,
      roles: ["ADMIN"],
      children: [],
    },    
  ];

  for (const menu of recoveredMenus) {
    const parent = await prisma.menuItem.create({
      data: {
        key: menu.key,
        title: menu.title,
        icon: menu.icon,
        path: menu.path,
        enabled: menu.enabled,
        order: menu.order,
        showIcon: menu.showIcon,
        roles: menu.roles,
      },
    });

    if (menu.children && menu.children.length > 0) {
      for (const child of menu.children) {
        await prisma.menuItem.create({
          data: {
            key: child.key,
            title: child.title,
            icon: child.icon,
            path: child.path,
            enabled: child.enabled,
            order: child.order,
            showIcon: child.showIcon,
            roles: child.roles,
            parentId: parent.id,
          },
        });
      }
    }
  }
  console.log("   ✓ Menús creados");

  // 4. Motivos de Baja
  const recoveredReasons = [
    { code: "FIRED", name: "Despedido", description: "Usuario despedido de la organización", displayOrder: 1 },
    { code: "RESIGNATION", name: "Renuncia", description: "Usuario renunció voluntariamente", displayOrder: 2 },
    { code: "CONTRACT_END", name: "Término de contrato", description: "Contrato temporal finalizó", displayOrder: 3 },
    { code: "MEDICAL_LEAVE", name: "Licencia médica prolongada", description: "Usuario en licencia médica indefinida", displayOrder: 4 },
    { code: "RETIREMENT", name: "Jubilación", description: "Usuario se jubiló", displayOrder: 5 },
    { code: "OTHER", name: "Otro motivo", description: "Otro motivo no especificado", displayOrder: 99 },
  ];

  for (const reason of recoveredReasons) {
    await prisma.userDeactivationReason.create({ data: reason });
  }

  const certDisablingReasons = [
    {
      code: "INSPECTION_PROCEDURE_FAIL",
      name: "Incumplimiento de procedimientos de inspección",
      description: "No seguir los protocolos establecidos para muestreo, vigilancia y control de enfermedades.",
      displayOrder: 1,
    },
    {
      code: "ENROLLMENT_REQUIREMENTS_LOSS",
      name: "Pérdida de requisitos de inscripción",
      description: "Dejar de cumplir con requisitos técnicos o financieros (ej: pérdida acreditación INN ISO 17.025).",
      displayOrder: 2,
    },
    {
      code: "SECTORAL_REGULATION_VIOLATION",
      name: "Infracciones a la normativa sectorial",
      description: "Violaciones a la Ley General de Pesca y Acuicultura o sus reglamentos.",
      displayOrder: 3,
    },
    {
      code: "SANITARY_MANAGEMENT_IMPACT",
      name: "Impacto en la gestión sanitaria",
      description: "Faltas que afectan la detección temprana de enfermedades o ponen en riesgo las medidas de control.",
      displayOrder: 4,
    },
  ];

  for (const reason of certDisablingReasons) {
    // Eliminado para evitar error TS
  }
}
