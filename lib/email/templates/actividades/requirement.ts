import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Interfaz para los datos del requerimiento de actividad
 */
export interface RequerimientoActividadPdfData {
  folio: string;
  folioPrefix: string;
  folioNumber: string;
  fechaTentativa: Date;
  nombreActividad: string;
  nombreSolicitante: string;
  estado: string;
  prioridad: string;
  area?: string;
  ubicacion?: string;
  descripcion: string;
  actividades: Array<{
    nombreActividad: string;
    descripcion: string;
    estado: string;
    valorEstimado?: number;
  }>;
}

/**
 * Configuración del correo (obtenida desde la BD)
 */
export interface RequerimientoEmailConfig {
  greeting: string;
  bodyIntro: string;
  bodyOutro: string;
  footerText: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
}

/**
 * Genera el HTML del correo para envío de requerimiento de actividad
 */
export function generateRequerimientoEmailHTML(
  requerimientoData: RequerimientoActividadPdfData,
  emailConfig: RequerimientoEmailConfig,
  proveedorNombre: string,
): string {
  const fechaTentativa = format(requerimientoData.fechaTentativa, "dd-MMM-yyyy", { locale: es });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${requerimientoData.folio}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .email-container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #284893 0%, #1e3a7a 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 300;
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 30px;
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
          color: #284893;
          font-weight: 500;
        }
        .intro {
          margin-bottom: 30px;
          font-size: 16px;
          line-height: 1.7;
        }
        .requerimiento-details {
          background-color: #f8f9fa;
          border-left: 4px solid #284893;
          padding: 20px;
          margin: 25px 0;
          border-radius: 0 8px 8px 0;
        }
        .requerimiento-details h3 {
          margin: 0 0 15px 0;
          color: #284893;
          font-size: 18px;
        }
        .detail-row {
          display: flex;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .detail-label {
          font-weight: 600;
          min-width: 150px;
          color: #555;
        }
        .detail-value {
          flex: 1;
          color: #333;
        }
        .actividades {
          background-color: #e8f5e8;
          padding: 20px;
          border-radius: 8px;
          margin: 25px 0;
        }
        .actividades h4 {
          margin: 0 0 15px 0;
          color: #2e7d32;
          text-align: center;
        }
        .actividad-item {
          background-color: white;
          padding: 15px;
          margin-bottom: 10px;
          border-radius: 6px;
          border-left: 3px solid #4caf50;
        }
        .actividad-nombre {
          font-weight: bold;
          color: #2e7d32;
          margin-bottom: 5px;
        }
        .actividad-descripcion {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }
        .actividad-info {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          font-size: 13px;
        }
        .actividad-info span {
          color: #555;
        }
        .outro {
          margin: 25px 0;
          font-size: 16px;
          line-height: 1.7;
        }
        .footer {
          background-color: #284893;
          color: white;
          padding: 25px;
          text-align: center;
        }
        .company-info {
          margin-bottom: 15px;
        }
        .company-info h4 {
          margin: 0 0 10px 0;
          font-size: 20px;
        }
        .company-info p {
          margin: 5px 0;
          opacity: 0.9;
        }
        .footer-note {
          font-size: 12px;
          opacity: 0.7;
          border-top: 1px solid rgba(255,255,255,0.2);
          padding-top: 15px;
          margin-top: 15px;
        }
        @media (max-width: 600px) {
          body {
            padding: 10px;
          }
          .header, .content, .footer {
            padding: 20px;
          }
          .detail-row {
            flex-direction: column;
          }
          .detail-label {
            min-width: auto;
            margin-bottom: 5px;
          }
          .actividad-info {
            flex-direction: column;
            gap: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Requerimiento de Actividad</h1>
          <p>${requerimientoData.folio} | Fecha: ${fechaTentativa}</p>
        </div>
        
        <div class="content">
          <div class="greeting">${emailConfig.greeting},</div>
          
          <div class="intro">
            ${emailConfig.bodyIntro}
          </div>
          
          <div class="requerimiento-details">
            <h3>📋 Detalles del Requerimiento</h3>
            
            <div class="detail-row">
              <div class="detail-label">Folio:</div>
              <div class="detail-value"><strong>${requerimientoData.folio}</strong></div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Fecha Tentativa:</div>
              <div class="detail-value">${fechaTentativa}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Actividad:</div>
              <div class="detail-value">${requerimientoData.nombreActividad}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Solicitante:</div>
              <div class="detail-value">${requerimientoData.nombreSolicitante}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Proveedor:</div>
              <div class="detail-value"><strong>${proveedorNombre}</strong></div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Estado:</div>
              <div class="detail-value">${requerimientoData.estado}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Prioridad:</div>
              <div class="detail-value">${requerimientoData.prioridad}</div>
            </div>
            
            ${
              requerimientoData.area
                ? `
            <div class="detail-row">
              <div class="detail-label">Área:</div>
              <div class="detail-value">${requerimientoData.area}</div>
            </div>
            `
                : ""
            }

            ${
              requerimientoData.ubicacion
                ? `
            <div class="detail-row">
              <div class="detail-label">Ubicación:</div>
              <div class="detail-value">${requerimientoData.ubicacion}</div>
            </div>
            `
                : ""
            }
            
            <div class="detail-row">
              <div class="detail-label">Descripción:</div>
              <div class="detail-value">${requerimientoData.descripcion}</div>
            </div>
          </div>
          
          ${
            requerimientoData.actividades.length > 0
              ? `
          <div class="actividades">
            <h4>🔧 Actividades Asignadas</h4>
            ${requerimientoData.actividades
              .map(
                (actividad) => `
              <div class="actividad-item">
                <div class="actividad-nombre">${actividad.nombreActividad}</div>
                <div class="actividad-descripcion">${actividad.descripcion}</div>
                <div class="actividad-info">
                  <div><strong>Estado:</strong> ${actividad.estado}</div>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
          `
              : ""
          }
          
          <div class="outro">
            ${emailConfig.bodyOutro}
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 0 8px 8px 0;">
            <strong>📎 Documento Adjunto:</strong> En este email encontrará el archivo PDF con todos los detalles del requerimiento.
          </div>
        </div>
        
        <div class="footer">
          <div class="company-info">
            <h4>${emailConfig.companyName}</h4>
            <p>${emailConfig.companyAddress}</p>
            <p>📞 ${emailConfig.companyPhone} | 📧 ${emailConfig.companyEmail}</p>
          </div>
          
          <div class="footer-note">
            ${emailConfig.footerText}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
