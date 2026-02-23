import { ExcelEngine } from "../../core/excel-engine";
import { format } from "date-fns";

export class AuditExcelReport extends ExcelEngine {
    constructor() {
        super({
            title: "Reporte de Auditoría de Sistema",
            sheetName: "Auditoría",
            columns: [
                { header: "Fecha", key: "createdAt", width: 25 },
                { header: "Usuario", key: "userName", width: 30 },
                { header: "Email", key: "userEmail", width: 35 },
                { header: "Evento", key: "eventType", width: 20 },
                { header: "Módulo", key: "module", width: 20 },
                { header: "IP", key: "ipAddress", width: 20 },
                { header: "URL", key: "pageUrl", width: 40 },
                { header: "Metadatos", key: "metadata", width: 50 },
            ]
        });
    }

    /**
     * Carga los datos en la hoja de Excel
     */
    async addData(logs: any[]) {
        // Primero preparamos el reporte (branding + headers)
        await this.prepare();

        // Luego agregamos las filas
        logs.forEach((log) => {
            this.worksheet.addRow({
                createdAt: format(log.createdAt, "dd/MM/yyyy HH:mm:ss"),
                userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : "Sistema",
                userEmail: log.user?.email || "N/A",
                eventType: log.eventType,
                module: log.module || "General",
                ipAddress: log.ipAddress || "N/A",
                pageUrl: log.pageUrl || "N/A",
                metadata: log.metadata ? JSON.stringify(log.metadata) : ""
            });
        });

        // Los estilos de datos se aplicarán automáticamente al llamar a getBuffer()
    }
}
