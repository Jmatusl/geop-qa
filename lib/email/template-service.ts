import { prisma } from "@/lib/prisma";
import { generateEmailHtml } from "./templates/base-template";

export interface CompiledTemplate {
    subject: string;
    html: string;
}

/**
 * Replaces {{variable}} placeholders in a string with values from the data object.
 */
function interpolate(text: string, data: Record<string, any>): string {
    if (!text) return "";
    let result = text;
    Object.keys(data).forEach((key) => {
        const value = data[key] != null ? String(data[key]) : "";
        const regex = new RegExp(`{{${key}}}`, "g");
        result = result.replace(regex, value);
    });
    return result;
}

/**
 * Fetches an email template by code, interpolates variables, and returns the full HTML.
 * Uses the base-template system for the outer layout.
 */
export async function getCompiledTemplate(
    code: string,
    data: Record<string, any>
): Promise<CompiledTemplate> {
    const template = await prisma.emailTemplate.findUnique({
        where: { code },
    });

    if (!template) {
        console.warn(`Email template '${code}' not found in database. using fallback.`);
        // Fallback or error handling depending on requirements.
        // For now, throwing error to make it visible that config is missing
        throw new Error(`Email template with code '${code}' not found`);
    }

    // 1. Interpolate Subject
    const subject = interpolate(template.subject, data);

    // 2. Interpolate Body Content (The part stored in DB)
    const bodyContent = interpolate(template.htmlContent, data);

    // 3. Obtener configuraciones de la Base de Datos para el Layout
    const [uiSetting, emailSetting] = await Promise.all([
        prisma.appSetting.findUnique({ where: { key: "UI_CONFIG" } }),
        prisma.appSetting.findUnique({ where: { key: "EMAIL_CONFIG" } })
    ]);

    const uiConfig = uiSetting?.value as any;
    const emailConfig = emailSetting?.value as any;

    // Función auxiliar para extraer el logo correcto (preferencia modo claro)
    const getLogo = (config: any) => {
        if (!config?.light_mode) return undefined;
        return config.light_mode.sourceType === 'base64' && config.light_mode.base64
            ? config.light_mode.base64
            : config.light_mode.image;
    };

    const emailTheme = {
        global: {
            logo_src: getLogo(uiConfig?.logo),
            client_logo_src: getLogo(uiConfig?.logo_cliente),
            show_client_logo: emailConfig?.show_client_logo ?? true,
            primary_color: uiConfig?.primary_color || '#283c7f',
            background_color: '#f9fafb',
            company_name: uiConfig?.title || 'SOTEX',
            show_footer_branding: true,
            logo_width: 150
        }
    };

    // 4. Wrap in Base Template (Logo, Footer, etc.)
    const fullHtml = generateEmailHtml(
        code,
        emailTheme,
        data as any,
        bodyContent
    );

    return {
        subject,
        html: fullHtml,
    };
}
