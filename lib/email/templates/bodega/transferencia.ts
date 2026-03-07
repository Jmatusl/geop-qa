export interface TransferenciaEmailParams {
  documentReference: string;
  mensajePersonalizado: string;
  originWarehouse: string;
  destinationWarehouse: string;
  observations: string;
  itemsCount: number;
  items?: Array<{
    articuloSku: string;
    articuloNombre: string;
    cantidadTransferir: number | string;
    unitCost?: number;
  }>;
  incluirTabla: boolean;
  responsable?: string;
  fecha?: string;
}

export function generateTransferenciaEmailHtml({
  documentReference,
  mensajePersonalizado,
  originWarehouse,
  destinationWarehouse,
  observations,
  itemsCount,
  items,
  incluirTabla,
  responsable,
  fecha,
}: TransferenciaEmailParams): string {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(val);
  };

  let itemsTable = "";
  if (incluirTabla && items && items.length > 0) {
    const rows = items
      .map((i) => {
        const qty = Number(i.cantidadTransferir) || 0;
        const cost = i.unitCost || 0;
        const total = qty * cost;

        return `
        <tr>
          <td style="padding: 10px; border: 1px solid #eee; font-size: 12px;">${i.articuloSku}</td>
          <td style="padding: 10px; border: 1px solid #eee; font-size: 12px;">${i.articuloNombre}</td>
          <td style="padding: 10px; border: 1px solid #eee; font-size: 12px; text-align: center;">${qty}</td>
          <td style="padding: 10px; border: 1px solid #eee; font-size: 12px; text-align: right;">${formatCurrency(total)}</td>
        </tr>
      `;
      })
      .join("");

    itemsTable = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f9fafb; text-align: left;">
            <th style="padding: 10px; border: 1px solid #eee; font-size: 12px; font-weight: bold; color: #666;">ID Artículo</th>
            <th style="padding: 10px; border: 1px solid #eee; font-size: 12px; font-weight: bold; color: #666;">Artículo</th>
            <th style="padding: 10px; border: 1px solid #eee; font-size: 12px; font-weight: bold; color: #666; text-align: center;">Cant.</th>
            <th style="padding: 10px; border: 1px solid #eee; font-size: 12px; font-weight: bold; color: #666; text-align: right;">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  const footerHtml = `
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 4px 0; color: #666;"><strong>Referencia:</strong></td>
        <td style="padding: 4px 0; text-align: right;">${documentReference}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #666;"><strong>Bodega Origen:</strong></td>
        <td style="padding: 4px 0; text-align: right;">${originWarehouse}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #666;"><strong>Bodega Destino:</strong></td>
        <td style="padding: 4px 0; text-align: right;">${destinationWarehouse}</td>
      </tr>
      ${
        responsable
          ? `
      <tr>
        <td style="padding: 4px 0; color: #666;"><strong>Responsable:</strong></td>
        <td style="padding: 4px 0; text-align: right;">${responsable}</td>
      </tr>`
          : ""
      }
      ${
        fecha
          ? `
      <tr>
        <td style="padding: 4px 0; color: #666;"><strong>Fecha:</strong></td>
        <td style="padding: 4px 0; text-align: right;">${fecha}</td>
      </tr>`
          : ""
      }
      <tr>
        <td style="padding: 4px 0; color: #666; vertical-align: top;"><strong>Motivo:</strong></td>
        <td style="padding: 4px 0; text-align: right; font-style: italic;">${observations || "Sin observaciones."}</td>
      </tr>
    </table>
  `;

  const mensajeFinal = mensajePersonalizado.replace(/\n/g, "<br/>");

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f4f4f4;">
      <div style="font-family: sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden; background-color: white;">
        <div style="background-color: #284893; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; tracking: 1px;">Notificación de Bodega</h2>
        </div>
        <div style="padding: 24px;">
          <div style="font-size: 15px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            ${mensajeFinal}
          </div>
          
          ${itemsTable}

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 13px; color: #666; line-height: 1.5;">
            <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 14px; color: #333;">Detalles del Movimiento</p>
            ${footerHtml}
          </div>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 11px; color: #999;">
          Este es un mensaje automático generado por el Sistema de Gestión de Bodega.
        </div>
      </div>
    </body>
    </html>
  `;
}
