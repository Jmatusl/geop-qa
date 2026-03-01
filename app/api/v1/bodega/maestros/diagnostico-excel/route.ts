import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { verifySession } from "@/lib/auth/session";

/**
 * Endpoint de diagnóstico para inspeccionar la estructura de un archivo Excel.
 * Solo disponible en desarrollo. Retorna las primeras 30 filas de todas las hojas.
 */
export async function POST(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo no proporcionado" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as never);

  const result: Record<string, any[][]> = {};

  for (const worksheet of workbook.worksheets) {
    const sheetData: any[][] = [];
    const maxRows = Math.min(worksheet.rowCount, 30);

    for (let rowIdx = 1; rowIdx <= maxRows; rowIdx++) {
      const row = worksheet.getRow(rowIdx);
      const cells: any[] = [];
      const maxCols = 10; // Mostrar primeras 10 columnas

      for (let colIdx = 1; colIdx <= maxCols; colIdx++) {
        const cell = row.getCell(colIdx);
        const v = cell.value;

        if (v === null || v === undefined) {
          cells.push(null);
        } else if (typeof v === "object" && "text" in v) {
          cells.push((v as any).text);
        } else if (typeof v === "object" && "richText" in v) {
          cells.push((v as any).richText?.map((rt: any) => rt.text).join("") ?? "");
        } else {
          cells.push(v);
        }
      }

      // Solo incluir filas que tienen al menos un valor no nulo
      if (cells.some((c) => c !== null)) {
        sheetData.push([rowIdx, ...cells]);
      }
    }

    result[worksheet.name] = sheetData;
  }

  return NextResponse.json({
    sheets: workbook.worksheets.map((ws) => ws.name),
    preview: result,
  });
}
