import jsPDF from "jspdf";
import { prisma } from "@/lib/prisma";
import FALLBACK_CONFIG from "@/lib/config/ui-config-fallback.json";

export interface PdfReportOptions {
  title: string;
  orientation?: "portrait" | "landscape";
  unit?: "pt" | "mm" | "cm" | "in";
  format?: string | number[];
}

export abstract class PdfEngine {
  protected doc: jsPDF;
  protected options: PdfReportOptions;
  protected primaryColor = "#283c7f";
  protected secondaryColor = "#64748b";

  constructor(options: PdfReportOptions) {
    this.options = options;
    this.doc = new jsPDF({
      orientation: options.orientation || "portrait",
      unit: options.unit || "mm",
      format: options.format || "a4",
    });
  }

  /**
   * Obtiene la configuración de reportes desde la BD o fallback
   */
  async getReportConfig() {
    const setting = await prisma.appSetting.findUnique({
      where: { key: "REPORT_CONFIG" },
    });
    const configFull = (setting?.value as any) || (FALLBACK_CONFIG as any).REPORT_CONFIG;
    return configFull?.pdf || configFull?.excel || {};
  }

  /**
   * Obtiene el logo corporativo basado en la configuración
   */
  async getBrandingLogo() {
    const setting = await prisma.appSetting.findUnique({
      where: { key: "UI_CONFIG" },
    });
    const uiConfig = (setting?.value as any) || FALLBACK_CONFIG;

    // Prioridad: REPORT_CONFIG.pdf.logo_base64 > UI_CONFIG.logo.light_mode.image
    const reportConfig = await this.getReportConfig();

    if (reportConfig.logo_base64) {
      return reportConfig.logo_base64;
    }

    return uiConfig.logo?.light_mode?.image || "/sotex/sotex_lightMode.png";
  }

  /**
   * Dibuja el encabezado estándar con logo y título
   */
  async applyHeader() {
    const reportConfig = await this.getReportConfig();
    const logo = await this.getBrandingLogo();

    // Logo (Top Right by default)
    try {
      if (logo.startsWith("data:image")) {
        this.doc.addImage(logo, "PNG", 160, 10, 35, 12);
      } else {
        // En un entorno de servidor, jspdf no puede cargar URLs relativas directamente fácilmente
        // pero si es una ruta pública (/...) podemos intentar manejarlo o dejar el espacio
        console.warn("PdfEngine: Image URL noted but base64 preferred for server side generation.");
      }
    } catch (e) {
      console.warn("PdfEngine: Error applying logo", e);
    }

    // Título
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(18);
    this.doc.setTextColor(this.primaryColor);
    this.doc.text(this.options.title.toUpperCase(), 15, 25);

    // Línea separadora
    this.doc.setDrawColor(this.primaryColor);
    this.doc.setLineWidth(0.5);
    this.doc.line(15, 28, 195, 28);
  }

  /**
   * Retorna el buffer del PDF
   */
  getBuffer(): Buffer {
    return Buffer.from(this.doc.output("arraybuffer"));
  }

  /**
   * Método abstracto que cada reporte debe implementar para llenar el contenido
   */
  abstract generate(data: any): Promise<void>;
}
