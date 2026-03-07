interface WREmailTemplateParams {
  folio: string;
  createdAt: string | Date;
  title: string;
  providerName: string;
  installationName: string;
  description: string;
  message?: string;
  primaryColor?: string;
  deliveryDate?: string;
}

export function generateWrEmailHtml({
  folio,
  createdAt,
  title,
  providerName,
  installationName,
  description,
  message,
  primaryColor = "#283c7f",
  deliveryDate = "POR CONFIRMAR",
}: WREmailTemplateParams): string {
  const dateFormatter = new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const formattedDate = typeof createdAt === "string" ? createdAt : dateFormatter.format(createdAt);

  const customMessageHtml = message
    ? `<div style="background-color: #f1f5f9; padding: 15px; border-radius: 4px; font-size: 13px; margin-bottom: 25px; font-style: italic; border-left: 4px solid #94a3b8; color: #334155;">
        <strong>Mensaje adjunto:</strong><br/>
        ${message.replace(/\n/g, "<br/>")}
       </div>`
    : "";

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #334155;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background-color: ${primaryColor}; color: #ffffff; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: normal;">Solicitud de Orden de Compra</h1>
          <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">${folio} | Fecha: ${formattedDate}</p>
        </div>
        
        <!-- Body -->
        <div style="padding: 30px 20px; text-align: left;">
          <p style="font-size: 16px; color: ${primaryColor}; margin-top: 0; margin-bottom: 20px;">Estimado/a,</p>
          
          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 25px;">
            Se adjunta requerimiento de trabajo para su revisión y gestión.
          </p>

          <!-- Detalles Card -->
          <div style="background-color: #f8fafc; border-left: 4px solid ${primaryColor}; border-radius: 4px; padding: 20px; margin-bottom: 25px;">
            <h3 style="font-size: 16px; font-weight: bold; color: ${primaryColor}; margin-top: 0; margin-bottom: 15px;">📋 Detalles de la Solicitud</h3>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b; width: 140px; vertical-align: top;">Folio:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; vertical-align: top;"><strong>${folio}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b; width: 140px; vertical-align: top;">Fecha Emisión:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; vertical-align: top;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b; width: 140px; vertical-align: top;">Centro de Cultivo:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; vertical-align: top;">${installationName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b; width: 140px; vertical-align: top;">Item Gasto:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; vertical-align: top;">${title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b; width: 140px; vertical-align: top;">Proveedor:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; vertical-align: top;">${providerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b; width: 140px; vertical-align: top;">Fecha Entrega:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; vertical-align: top;">${deliveryDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: none; font-weight: bold; color: #64748b; width: 140px; vertical-align: top;">Descripción:</td>
                <td style="padding: 8px 0; border-bottom: none; vertical-align: top;">${description}</td>
              </tr>
            </table>
          </div>

          ${customMessageHtml}

          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 25px;">
            Agradecemos su pronta respuesta y quedamos atentos a sus comentarios.
          </p>

          <!-- Alert Box -->
          <div style="background-color: #fef9c3; border-left: 4px solid #eab308; padding: 15px; font-size: 13px; border-radius: 4px; color: #854d0e;">
            📎 <strong>Documento Adjunto:</strong> En este email encontrará el archivo PDF con todos los detalles de la solicitud.
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
}
