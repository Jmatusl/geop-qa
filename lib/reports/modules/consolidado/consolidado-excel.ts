import { ExcelEngine } from "../../core/excel-engine";
import { format } from "date-fns";

export class ConsolidadoExcelReport extends ExcelEngine {
  constructor(type: "requests" | "wrs") {
    const options =
      type === "requests"
        ? {
            title: "Consolidado de Solicitudes de Mantención",
            sheetName: "Solicitudes",
            columns: [
              { header: "Folio", key: "folio", width: 10 },
              { header: "Equipo", key: "equipment", width: 30 },
              { header: "Marca", key: "brand", width: 15 },
              { header: "Sistema", key: "system", width: 20 },
              { header: "Folio RT", key: "wrFolio", width: 15 },
              { header: "Proveedor RT", key: "wrProvider", width: 30 },
              { header: "Solicitante", key: "applicant", width: 25 },
              { header: "Tipo", key: "type", width: 20 },
              { header: "Fecha Ingreso", key: "createdAt", width: 20 },
              { header: "Instalación", key: "installation", width: 20 },
              { header: "Estado", key: "status", width: 15 },
              { header: "Días Req.", key: "days", width: 10 },
              { header: "F. Solución", key: "solutionDate", width: 15 },
            ],
          }
        : {
            title: "Consolidado de Requerimientos de Trabajo (RT)",
            sheetName: "RTs",
            columns: [
              { header: "Folio RT", key: "folio", width: 15 },
              { header: "Proveedor", key: "provider", width: 35 },
              { header: "RUT", key: "rut", width: 15 },
              { header: "Título", key: "title", width: 40 },
              { header: "Estado", key: "status", width: 15 },
              { header: "N° OC", key: "ocNumber", width: 15 },
              { header: "Creada", key: "createdAt", width: 20 },
            ],
          };

    super(options);
  }

  async addRequestsData(requests: any[]) {
    await this.prepare();

    requests.forEach((r) => {
      const start = new Date(r.createdAt);
      const end = r.resolvedAt ? new Date(r.resolvedAt) : new Date();
      const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 3600 * 24));

      const wr = r.mntWorkRequirementRelations?.[0]?.workRequirement;

      this.worksheet.addRow({
        folio: r.folio,
        equipment: r.equipment.name,
        brand: r.equipment.brand || "N/A",
        system: r.equipment.system?.name || "N/A",
        wrFolio: wr?.folio || "N/A",
        wrProvider: wr?.provider ? wr.provider.legalName || wr.provider.fantasyName : "N/A",
        applicant: r.applicant?.name || "N/A",
        type: r.type.name,
        createdAt: format(new Date(r.createdAt), "dd/MM/yyyy HH:mm"),
        installation: r.installation.name,
        status: r.status.name,
        days: diffDays,
        solutionDate: r.resolvedAt ? format(new Date(r.resolvedAt), "dd/MM/yyyy") : "N/A",
      });
    });
  }

  async addWRData(wrs: any[]) {
    await this.prepare();

    wrs.forEach((wr) => {
      this.worksheet.addRow({
        folio: wr.folio,
        provider: wr.provider.legalName || wr.provider.fantasyName,
        rut: wr.provider.rut,
        title: wr.title,
        status: wr.status.name,
        ocNumber: wr.ocNumber || "S/O",
        createdAt: format(new Date(wr.createdAt), "dd/MM/yyyy HH:mm"),
      });
    });
  }
}
