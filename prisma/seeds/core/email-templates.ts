import { PrismaClient } from "@prisma/client";

export async function seedEmailTemplates(prisma: PrismaClient, systemUserId?: string) {
  console.log("📧 Seeding Email Templates...");

  const templates = [
    {
      code: "USER_CREATION",
      name: "Creación de Usuario",
      description: "Notificación enviada al crear un nuevo usuario para que active su cuenta.",
      subject: "Bienvenido a GEOP - Sotex - Activa tu Cuenta",
      variables: ["{{name}}", "{{action_url}}", "{{expiration}}"],
      htmlContent: `<h1 style="color: #1e293b; font-size: 24px; font-weight: 700; margin-bottom: 24px; text-align: center;">Activa tu cuenta</h1>
                    
<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hola, {{name}}</p>

<p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px;">Se ha creado una cuenta para ti en GEOP - Sotex. Haz clic en el botón a continuación para configurar tu contraseña y activar tu acceso.</p>

<!-- Call to Action Button -->
<div style="text-align: center; margin-bottom: 32px;">
    <a href="{{action_url}}" style="background-color: #283c7f; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        Activar Cuenta
    </a>
</div>

<p style="font-size: 14px; color: #64748b; margin-bottom: 12px; text-align: center;">Este enlace expira en {{expiration}}.</p>`,
    },
    {
      code: "PASSWORD_RESET",
      name: "Restablecimiento de Contraseña",
      description: "Notificación enviada cuando un usuario solicita recuperar su contraseña.",
      subject: "Recuperación de Contraseña - GEOP - Sotex",
      variables: ["{{name}}", "{{action_url}}", "{{expiration}}"],
      htmlContent: `<h1 style="color: #1e293b; font-size: 24px; font-weight: 700; margin-bottom: 24px; text-align: center;">Recuperación de Contraseña</h1>
                    
<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hola, {{name}}</p>

<p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px;">Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el botón a continuación para crear una nueva.</p>

<!-- Call to Action Button -->
<div style="text-align: center; margin-bottom: 32px;">
    <a href="{{action_url}}" style="background-color: #283c7f; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        Restablecer Contraseña
    </a>
</div>

<p style="font-size: 14px; color: #64748b; margin-bottom: 12px; text-align: center;">Este enlace expira en {{expiration}}.</p>

<p style="font-size: 14px; color: #94a3b8; margin-bottom: 0; text-align: center;">Si no solicitaste este cambio, puedes ignorar este correo.</p>`,
    },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { code: t.code },
      update: {
        // Solo actualizamos description/variables si ya existe, para no pisar cambios del usuario
        // Opcional: Podríamos no actualizar nada si ya existe
      },
      create: {
        code: t.code,
        name: t.name,
        description: t.description,
        subject: t.subject,
        htmlContent: t.htmlContent,
        variables: t.variables,
        updatedById: systemUserId,
      },
    });
  }

  console.log(`✅ ${templates.length} email templates processed`);
}
