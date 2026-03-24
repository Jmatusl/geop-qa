export interface MovimientoEmailParams {
  type: "INGRESO" | "SALIDA" | "AJUSTE" | "DEVOLUCION";
  documentReference: string;
  mensajePersonalizado: string;
  warehouseName: string;
  observations: string;
  itemsCount: number;
  items?: Array<{
    articuloSku: string;
    articuloNombre: string;
    cantidad: number | string;
    unitCost?: number;
  }>;
  incluirTabla: boolean;
  responsable?: string;
  fecha?: string;
  costCenterName?: string;
}

export function generateMovimientoEmailHtml({
  type,
  documentReference,
  mensajePersonalizado,
  warehouseName,
  observations,
  itemsCount,
  items,
  incluirTabla,
  responsable,
  fecha,
  costCenterName,
}: MovimientoEmailParams): string {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(val);
  };

  const getTitle = () => {
    switch (type) {
      case "INGRESO":
        return "Aviso de Ingreso a Bodega";
      case "SALIDA":
        return "Aviso de Egreso / Retiro";
      case "AJUSTE":
        return "Aviso de Ajuste de Inventario";
      case "DEVOLUCION":
        return "Aviso de Devolución";
      default:
        return "Notificación de Bodega";
    }
  };

  const getHeaderColor = () => {
    switch (type) {
      case "INGRESO":
        return "#059669"; // Emerald 600
      case "SALIDA":
        return "#7c2d12"; // Orange 900 / Rust
      default:
        return "#284893"; // Blue
    }
  };

  let itemsTable = "";
  if (incluirTabla && items && items.length > 0) {
    const rows = items
      .map((i) => {
        const qty = Number(i.cantidad) || 0;
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
        <td style="padding: 4px 0; color: #666;"><strong>Bodega:</strong></td>
        <td style="padding: 4px 0; text-align: right;">${warehouseName}</td>
      </tr>
      ${
        costCenterName
          ? `
      <tr>
        <td style="padding: 4px 0; color: #666;"><strong>Centro Costo:</strong></td>
        <td style="padding: 4px 0; text-align: right;">${costCenterName}</td>
      </tr>`
          : ""
      }
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
        <div style="background-color: ${getHeaderColor()}; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; tracking: 1px;">${getTitle()}</h2>
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
