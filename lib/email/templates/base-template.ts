interface GlobalConfig {
    logo_type?: 'url' | 'base64';
    logo_src: string;
    logo_width: number;
    primary_color: string;
    background_color: string;
    company_name: string;
    company_address: string;
    show_footer_branding: boolean;
    client_logo_src?: string;
    show_client_logo?: boolean;
}

interface TemplateConfig {
    title: string;
    greeting: string;
    instruction: string;
    button_text: string;
    expiration_text?: string;
    ignore_text?: string;
}

interface EmailThemeConfig {
    global: GlobalConfig;
    templates: {
        [key: string]: TemplateConfig;
    };
}

interface TemplateData {
    name: string;
    action_url: string;
    expiration?: string;
    [key: string]: any;
}

const DEFAULT_THEME: EmailThemeConfig = {
    global: {
        logo_type: 'url',
        logo_src: '/sotex/sotex_lightMode.png',
        logo_width: 150,
        primary_color: '#283c7f',
        background_color: '#f9fafb',
        company_name: 'SOTEX',
        company_address: '',
        show_footer_branding: true
    },
    templates: {
        password_reset: {
            title: 'Recuperación de Contraseña',
            greeting: 'Hola, {{name}}',
            instruction: 'Haz clic en el botón para restablecer tu contraseña.',
            button_text: 'Restablecer',
            expiration_text: 'Expira en 24h',
            ignore_text: 'Ignorar si no lo solicitaste.'
        },
        activation: {
            title: 'Activa tu cuenta',
            greeting: 'Hola, {{name}}',
            instruction: 'Haz clic en el botón para activar tu cuenta.',
            button_text: 'Activar',
            expiration_text: 'Expira en 7 días'
        }
    }
};

/**
 * Replaces all occurrences of {{key}} with values from data
 */
function replaceVariables(text: string, data: TemplateData): string {
    if (!text) return '';
    let result = text;
    Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, data[key]);
    });
    return result;
}

/**
 * Generates the complete HTML for an email using the configuration and data provided.
 */
export function generateEmailHtml(
    type: string,
    config: any | null,
    data: TemplateData,
    customBody?: string // Nuevo argumento opcional para contenido HTML completo (user generated)
): string {
    const c = config || DEFAULT_THEME;
    const g = c.global || DEFAULT_THEME.global;

    // Support both structured config (templates.type) and flat config (from auth-fallback)
    const t = c.templates?.[type] || c[type] || DEFAULT_THEME.templates[type as any] || DEFAULT_THEME.templates['activation'];

    // --- Lógica Inteligente de Resolución de Logos ---
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

    const resolveLogo = (src: string | undefined) => {
        if (!src) return undefined;

        // 1. Si ya es una URL absoluta o Base64, retornar tal cual
        if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
            return src;
        }

        // 2. Si es una ruta relativa, anteponer el dominio
        const cleanPath = src.startsWith('/') ? src : `/${src}`;
        return `${appUrl}${cleanPath}`;
    };

    const logoSrc = resolveLogo(g.logo_src || g.logo_url);
    const clientLogoSrc = g.show_client_logo ? resolveLogo(g.client_logo_src) : undefined;
    const hasBothLogos = !!(logoSrc && clientLogoSrc);

    // Replace variables in all strings
    const title = replaceVariables(t.title, data);
    const greeting = replaceVariables(t.greeting, data);
    const instruction = replaceVariables(t.instruction, data);
    const button_text = replaceVariables(t.button_text, data);
    const expiration_text = t.expiration_text ? replaceVariables(t.expiration_text, data) : '';
    const ignore_text = t.ignore_text ? replaceVariables(t.ignore_text, data) : '';

    const content = customBody || `
                    <h1 style="color: #1e293b; font-size: 24px; font-weight: 700; margin-bottom: 24px; text-align: center;">${title}</h1>
                    
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">${greeting}</p>
                    
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px;">${instruction}</p>
                    
                    <!-- Call to Action Button -->
                    <div style="text-align: center; margin-bottom: 32px;">
                        <a href="${data.action_url}" style="background-color: ${g.primary_color}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            ${button_text}
                        </a>
                    </div>
                    
                    ${expiration_text ? `<p style="font-size: 14px; color: #64748b; margin-bottom: 12px; text-align: center;">${expiration_text}</p>` : ''}
                    
                    ${ignore_text ? `<p style="font-size: 14px; color: #94a3b8; margin-bottom: 0; text-align: center;">${ignore_text}</p>` : ''}
    `;

    return `
    <!DOCTYPE html>
    <html lang="es" xml:lang="es" xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Language" content="es">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${g.background_color}; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
        <!-- Hidden Preheader for Language Detection -->
        <span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
            Resumen de alertas del sistema de certificaciones. Por favor revise el estado de su documentación.
        </span>
        <div lang="es" style="width: 100%; background-color: ${g.background_color}; padding: 10px 0;">
            <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
                
                <!-- Header / Logo -->
                <div style="padding: 24px 20px 10px 20px;">
                    ${hasBothLogos ? `
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td align="left" valign="middle" style="width: 50%;">
                                <img src="${logoSrc}" height="40" alt="${g.company_name}" style="border: 0; display: block; max-height: 40px; width: auto;" />
                            </td>
                            <td align="right" valign="middle" style="width: 50%;">
                                <img src="${clientLogoSrc}" height="40" alt="Cliente" style="border: 0; display: block; max-height: 40px; width: auto;" />
                            </td>
                        </tr>
                    </table>
                    ` : `
                    <div style="text-align: center;">
                        <img src="${logoSrc}" width="${g.logo_width}" alt="${g.company_name}" style="border: 0; display: block; margin: 0 auto; max-width: 100%; height: auto;" />
                    </div>
                    `}
                </div>
                
                <!-- Content -->
                <div style="padding: 0 12px 30px 12px; text-align: left; color: #334155;">
                    ${content}
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    ${g.show_footer_branding ? `
                        <p style="font-size: 14px; font-weight: 600; color: #475569; margin: 0 0 8px 0;">${g.company_name}</p>
                        ${g.company_address ? `<p style="font-size: 12px; color: #94a3b8; margin: 0;">${g.company_address}</p>` : ''}
                    ` : ''}
                </div> <!-- Close 600px Card -->
            </div>
            
            <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                <p>&copy; ${new Date().getFullYear()} ${g.company_name}${g.footer_copyright ? `. ${g.footer_copyright}` : ''}</p>
            </div>
        </div> <!-- Close 100% Background -->
      </body>
    </html>
    `;
}

