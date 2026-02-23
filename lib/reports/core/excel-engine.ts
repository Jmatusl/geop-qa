import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import FALLBACK_CONFIG from "@/lib/config/ui-config-fallback.json";

export interface ExcelReportOptions {
    title: string;
    sheetName: string;
    columns: Partial<ExcelJS.Column>[];
}

export class ExcelEngine {
    protected workbook: ExcelJS.Workbook;
    protected worksheet: ExcelJS.Worksheet;
    protected options: ExcelReportOptions;

    constructor(options: ExcelReportOptions) {
        this.options = options;
        this.workbook = new ExcelJS.Workbook();
        this.worksheet = this.workbook.addWorksheet(options.sheetName);

        // Map keys and widths but avoid automatic headers in Row 1
        // Esto evita que ExcelJS escriba los títulos en la fila 1 automáticamente
        this.worksheet.columns = options.columns.map(col => ({
            key: col.key,
            width: col.width,
            header: undefined
        }));
    }

    /**
     * Genera el reporte básico con branding y títulos
     */
    async prepare() {
        await this.applyBranding();
        this.applyTitle();
        this.applyHeaderStyles();
    }

    /**
     * Obtiene la configuración de reportes desde la BD o fallback
     */
    private async getReportConfig() {
        const setting = await prisma.appSetting.findUnique({
            where: { key: 'REPORT_CONFIG' }
        });
        const configFull = (setting?.value as any) || (FALLBACK_CONFIG as any).REPORT_CONFIG;
        return configFull?.excel || {};
    }

    /**
     * Aplica el logo corporativo basado en la configuración
     */
    private async applyBranding() {
        const config = await this.getReportConfig();

        try {
            let imageBuffer: Buffer | null = null;
            const extension: 'png' | 'jpeg' | 'gif' = 'png';

            if (config.logo_base64) {
                imageBuffer = Buffer.from(config.logo_base64.split(",")[1] || config.logo_base64, "base64");
            } else if (config.logo) {
                const publicPath = path.join(process.cwd(), "public", config.logo);
                if (fs.existsSync(publicPath)) {
                    imageBuffer = fs.readFileSync(publicPath);
                }
            }

            if (imageBuffer) {
                const imageId = this.workbook.addImage({
                    buffer: imageBuffer as any,
                    extension: extension,
                });

                const startCol = config.ubication === 'top-right' ? (this.options.columns.length - 2) : 0;
                const width = config.width || 256;
                const height = config.height || 86;

                this.worksheet.addImage(imageId, {
                    tl: { col: Math.max(0, startCol), row: 0 },
                    ext: { width: width, height: height },
                    editAs: 'oneCell'
                });
            }
        } catch (error) {
            console.warn("ExcelEngine: Could not apply branding logo:", error);
        }
    }

    /**
     * Agrega el título del reporte centrado
     */
    private applyTitle() {
        const lastColLetter = String.fromCharCode(64 + this.options.columns.length);
        const range = `A4:${lastColLetter}4`;

        this.worksheet.mergeCells(range);
        const titleCell = this.worksheet.getCell('A4');
        titleCell.value = this.options.title.toUpperCase();
        titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF283C7F' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    /**
     * Aplica estilos a la fila de cabecera (Fila 6)
     */
    private applyHeaderStyles() {
        // Obtenemos la fila 6 para las cabeceras
        const headerRow = this.worksheet.getRow(6);

        // Escribimos los títulos manualmente desde la configuración de columnas
        this.options.columns.forEach((col, index) => {
            headerRow.getCell(index + 1).value = col.header as string;
        });

        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF283C7F' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    }

    /**
     * Aplica estilos de celda a todos los datos (Fila 7 en adelante)
     */
    protected applyDataStyles() {
        this.worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 6) {
                row.eachCell((cell) => {
                    cell.alignment = { vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            }
        });
    }

    /**
     * Retorna el buffer final
     */
    async getBuffer(): Promise<any> {
        this.applyDataStyles();
        return await this.workbook.xlsx.writeBuffer();
    }
}
