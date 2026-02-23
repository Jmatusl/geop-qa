import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

let resendClient: Resend | null = null;

/**
 * Obtener instancia del cliente Resend
 */
async function getResendClient(): Promise<Resend | null> {
  if (resendClient) return resendClient;

  const emailConfig = await prisma.appSetting.findUnique({
    where: { key: "EMAIL_CONFIG" },
  });

  if (!emailConfig) return null;

  const config = emailConfig.value as any;

  if (!config.enabled || !config.resend_api_key) {
    return null;
  }

  resendClient = new Resend(config.resend_api_key);
  return resendClient;
}

/**
 * Enviar correo usando Resend
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
  }>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtener configuración de correo desde la base de datos
    const emailConfig = await prisma.appSetting.findUnique({
      where: { key: "EMAIL_CONFIG" },
    });

    if (!emailConfig) {
      console.log("⚠️ Email config not found, skipping email send");
      return { success: false, error: "Email config not found" };
    }

    const config = emailConfig.value as any;

    // Verificar si las notificaciones están habilitadas
    if (!config.send_notifications) {
      console.log("⚠️ Email notifications disabled, skipping email send");
      return { success: false, error: "Email notifications disabled" };
    }

    // Verificar si Resend está configurado
    if (!config.enabled || !config.resend_api_key) {
      console.log("⚠️ Resend not configured, skipping email send");
      return { success: false, error: "Resend not configured" };
    }

    const resend = await getResendClient();
    if (!resend) {
      console.log("⚠️ Could not initialize Resend client");
      return { success: false, error: "Could not initialize Resend client" };
    }

    const { data, error } = await resend.emails.send({
      from: `${config.from_name} <${config.from_email}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    });

    if (error) {
      console.error("❌ Error sending email:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Email sent successfully:", data);
    return { success: true };
  } catch (error) {
    console.error("❌ Unexpected error sending email:", error);
    return { success: false, error: String(error) };
  }
}

import { generateEmailHtml } from "./templates/base-template";
import { getCompiledTemplate } from "./template-service";
import mailConfigAuthFallback from "@/lib/config/mail-config-auth-fallback.json";
import uiConfigFallback from "@/lib/config/ui-config-fallback.json";

/**
 * Obtener template desde BD o fallback
 */
async function getEmailTemplate(code: string) {
  // 1. Intentar cargar desde BD (EmailTemplate)
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { code },
    });

    if (template && template.isActive) {
      return {
        subject: template.subject,
        htmlContent: template.htmlContent,
      };
    }
  } catch (e) {
    console.warn(`Could not fetch EmailTemplate for ${code}`, e);
  }

  // 2. Fallback a configuración antigua (hardcoded o JSON)
  const fallbackConfig = await getAuthEmailConfig();
  const fallbackKey = code === "USER_CREATION" ? "user_creation_mail" : "password_reset_mail";
  const fallbackData = fallbackConfig[fallbackKey];

  if (fallbackData) {
    return {
      subject: fallbackData.subject,
      htmlContent: null, // Indicar que use el generador antiguo si no hay HTML custom
    };
  }

  return null;
}

/**
 * Helper para obtener configuración de UI y Logo
 */
async function getThemeConfig() {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: "UI_CONFIG" },
    });

    if (setting?.value) {
      return setting.value as any;
    }
  } catch (error) {
    console.error("Error fetching UI_CONFIG:", error);
  }

  return uiConfigFallback;
}

/**
 * Wrapper para generar el HTML final inyectando el logo correcto
 */
async function prepareEmailBody(code: string, data: any) {
  const template = await getEmailTemplate(code);
  const themeConfig = await getThemeConfig();

  // Extraer Logo desde UI_CONFIG (priorizando Light Mode para correos)
  // NOTA: uiConfigFallback define logo.light_mode.image
  const logoUrl = themeConfig.logo?.light_mode?.image || "/sotex/sotex_lightMode.png";
  const companyName = themeConfig.title || "Sistema Certificaciones";

  // Resolver URL absoluta del logo si es relativa
  const fullLogoUrl = logoUrl.startsWith("http") ? logoUrl : `${process.env.NEXT_PUBLIC_APP_URL || ""}${logoUrl}`;

  // Resolver Logo Cliente (si existe)
  const clientLogoUrl = themeConfig.logo_cliente?.light_mode?.image;
  let fullClientLogoUrl = undefined;

  if (clientLogoUrl) {
    fullClientLogoUrl = clientLogoUrl.startsWith("http") ? clientLogoUrl : `${process.env.NEXT_PUBLIC_APP_URL || ""}${clientLogoUrl}`;
  }

  let html = "";
  let subject = "";

  if (template?.htmlContent) {
    // Usar HTML guardado en BD
    html = template.htmlContent;
    subject = template.subject;

    // Reemplazar variables estándar
    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      html = html.replace(regex, data[key]);
      subject = subject.replace(regex, data[key]);
    });

    html = generateEmailHtml(
      "custom",
      {
        global: {
          logo_src: fullLogoUrl,
          client_logo_src: fullClientLogoUrl,
          primary_color: themeConfig.primary_color || "#283c7f",
          background_color: "#f9fafb",
          company_name: companyName,
          company_address: "",
          show_footer_branding: true,
        },
        templates: {
          custom: {
            title: "",
            greeting: "",
            instruction: "",
            button_text: "",
            expiration_text: "",
          },
        },
      },
      data,
      html,
    ); // Pasamos html como 4to argumento (customBody)
  } else {
    // Fallback antiguo
    const mapType = code === "USER_CREATION" ? "activation" : "password_reset";

    // Configuración Híbrida: Logo nuevo + Textos viejos
    const legacyConfig = {
      global: {
        logo_src: fullLogoUrl,
        client_logo_src: fullClientLogoUrl,
        primary_color: themeConfig.primary_color || "#283c7f",
        background_color: "#f9fafb",
        company_name: companyName,
        company_address: "",
        show_footer_branding: true,
      },
      templates: {
        [mapType]: {
          ...(await getAuthEmailConfigForType(code)), // Helper interno
        },
      },
    };

    html = generateEmailHtml(mapType, legacyConfig, data);
    subject = template?.subject || (code === "USER_CREATION" ? "Activa tu cuenta" : "Recuperación de Contraseña");
  }

  return { subject, html };
}

// Helper auxiliar para recuperar config vieja si no hay template en BD
async function getAuthEmailConfigForType(code: string) {
  const authConfig = await getAuthEmailConfig();
  if (code === "USER_CREATION") return authConfig.user_creation_mail;
  return authConfig.password_reset_mail;
}

/**
 * Helper para obtener configuración de correo de autenticación (desde BD o fallback)
 */
async function getAuthEmailConfig() {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: "MAIL_CONFIG-AUTH" },
    });

    if (setting?.value) {
      return {
        ...(mailConfigAuthFallback as any),
        ...(setting.value as any),
      };
    }
  } catch (error) {
    console.error("Error fetching MAIL_CONFIG-AUTH:", error);
  }

  return mailConfigAuthFallback as any;
}

/**
 * Helper para obtener configuración de expiración
 */
async function getExpirationConfig() {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: "EXPIRATION_CONFIG" },
    });
    return (setting?.value as any) || { activation_token_days: 7, password_reset_token_hours: 24 };
  } catch {
    return { activation_token_days: 7, password_reset_token_hours: 24 };
  }
}

/**
 * Enviar correo de activación
 */
export async function sendActivationEmail(email: string, token: string, firstName: string) {
  const activationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/activate/${token}`;
  const expConfig = await getExpirationConfig();

  const { subject, html } = await getCompiledTemplate("USER_CREATION", {
    name: firstName,
    action_url: activationUrl,
    expiration: `${expConfig.activation_token_days} días`,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * Enviar correo de restablecimiento de contraseña
 */
export async function sendPasswordResetEmail(email: string, token: string, firstName: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset/${token}`;
  const expConfig = await getExpirationConfig();

  const { subject, html } = await getCompiledTemplate("PASSWORD_RESET", {
    name: firstName,
    action_url: resetUrl,
    expiration: `${expConfig.password_reset_token_hours} horas`,
  });

  return sendEmail({
    to: email,
    subject,
    html,
  });
}
