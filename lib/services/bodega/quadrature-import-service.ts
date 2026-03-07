import ExcelJS from "exceljs";

import { prisma } from "@/lib/prisma";

interface ParsedRow {
  articleName: string;
  quantity: number;
  warehouseName: string;
  centerCode?: string;
  unitPrice?: number;
  brand?: string;
  observations?: string;
}

// Palabras clave que identifican una fila de encabezado (no datos)
const HEADER_KEYWORDS = ["descripción", "descripcion", "nombre", "artículo", "articulo", "item", "detalle", "n° de parte", "parte"];

function isHeaderRow(colA: string): boolean {
  const lower = colA.toLowerCase().trim();
  return HEADER_KEYWORDS.some((kw) => lower.includes(kw));
}

interface ImportResult {
  processedRows: number;
  skippedRows: number;
  createdArticles: number;
  createdWarehouses: number;
  updatedStockRows: number;
  createdCenters: number;
}

const CENTROS_COSTO_KEY = "BODEGA_MAESTROS_CENTROS_COSTO";

function normalizeCode(value: string, fallbackPrefix: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();

  if (!normalized) return `${fallbackPrefix}-${Date.now().toString().slice(-6)}`;
  return normalized.slice(0, 30);
}

function getRawValue(value: ExcelJS.CellValue): any {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    if ("result" in value) return value.result; // Resultado de fórmula
    if ("text" in value) return value.text; // Hipervínculo
    if ("richText" in (value as any)) {
      return (value as any).richText.map((rt: any) => rt.text || "").join("");
    }
  }
  return value;
}

function getCellText(value: ExcelJS.CellValue) {
  const raw = getRawValue(value);
  if (raw === null || raw === undefined) return "";
  return String(raw).trim();
}

function getCellNumber(value: ExcelJS.CellValue) {
  const raw = getRawValue(value);
  if (typeof raw === "number") return raw;
  if (!raw) return 0;

  // Limpiar formatos de moneda ($, espacios, puntos de miles) y cambiar coma por punto decimal
  const text = String(raw)
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "") // En Chile el punto suele ser separador de miles
    .replace(/,/g, "."); // Y la coma separador decimal

  const parsed = parseFloat(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class BodegaQuadratureImportService {
  private readonly prisma = prisma;

  private parseRows(workbook: ExcelJS.Workbook): ParsedRow[] {
    // Buscar la hoja "Cuadratura" de forma robusta (insensible a mayúsculas y espacios)
    let worksheet = workbook.getWorksheet("Cuadratura");
    if (!worksheet) {
      worksheet = workbook.worksheets.find((ws) => ws.name.trim().toLowerCase() === "cuadratura");
    }

    if (!worksheet) {
      const allNames = workbook.worksheets.map((ws) => ws.name).join(", ");
      throw new Error(`No se encontró la hoja 'Cuadratura' en el archivo. Hojas disponibles: ${allNames}`);
    }

    const sheetNames = workbook.worksheets.map((ws) => ws.name).join(", ");

    // Validación estricta solicitada: La celda D3 (fila 3, columna 4) DEBE decir "Ubicación"
    const cellD3Val = getCellText(worksheet.getRow(3).getCell(4).value).toLowerCase();
    if (!cellD3Val.includes("ubicación") && !cellD3Val.includes("ubicacion")) {
      throw new Error("El archivo no tiene el formato correcto: La celda D3 debe contener la palabra 'Ubicación'.");
    }

    // 1. Auto-detectar la fila de cabeceras y qué columna tiene cada tipo de dato.
    let headerRowIdx = -1;
    let colName = -1,
      colQty = -1,
      colWarehouse = -1,
      colPrice = -1,
      colCeco = -1;

    let colBrand = -1,
      colObs = -1,
      colComment = -1;

    for (let r = 1; r <= Math.min(worksheet.rowCount, 20); r++) {
      const row = worksheet.getRow(r);
      let foundInThisRow = false;
      for (let c = 1; c <= 25; c++) {
        const val = getCellText(row.getCell(c).value).toLowerCase();
        if (val.includes("descripción / n° de parte") || val.includes("descripción") || val.includes("descripcion") || (val.includes("artículo") && !val.includes("tipo")) || val === "articulo") {
          headerRowIdx = r;
          colName = c;
          foundInThisRow = true;
          break;
        }
      }

      if (foundInThisRow) {
        // Encontramos la fila de cabeceras. Mapear el resto de columnas en ESTA MISMA fila.
        const rowData = worksheet.getRow(headerRowIdx);
        for (let c = 1; c <= 25; c++) {
          const val = getCellText(rowData.getCell(c).value).toLowerCase();

          // Cantidad
          if (val === "cantidad" || val === "cant" || val === "saldo" || val.includes("cant.")) {
            colQty = c;
          }

          // Bodega / Ubicación (Prioridad absoluta a "Ubicación")
          if (val === "ubicación" || val === "ubicacion") {
            colWarehouse = c;
          } else if (colWarehouse === -1 && (val === "bodega" || val.includes("destino"))) {
            colWarehouse = c;
          }

          // Precio Unitario (Detectar y evitar falsos positivos con totales)
          const isPriceTerm = val.includes("precio") || val.includes("valor") || val.includes("costo") || val === "unit";
          const isUnitTerm = val.includes("unit") || val.includes("uni.");
          const isTotalTerm = val.includes("total") || val.includes("sum");

          if (isPriceTerm && !isTotalTerm) {
            // Si es un término de unidad específico, sobreescribir cualquier match genérico previo
            if (colPrice === -1 || isUnitTerm) {
              colPrice = c;
            }
          }

          // CeCo
          if (val === "ceco" || val === "cc" || val.includes("centro de costo") || val.includes("c.costo")) {
            colCeco = c;
          }

          // Otros
          if (val === "marca") colBrand = c;
          if (val.includes("observación") || val.includes("observacion")) colObs = c;
          if (val.includes("comentario")) colComment = c;
        }
        break;
      }
    }

    if (colName === -1) {
      // Mapeo estrictamente solicitado por el usuario para su archivo de Cuadratura
      colName = 1; // Col A ("Descripción / N° de parte")
      colQty = 3; // Col C ("Cantidad")
      colWarehouse = 4; // Col D ("Ubicación")
      colPrice = 5; // Col E ("Precio Uni")
      colCeco = 7; // Col G ("CeCo")
      colComment = 18; // Col R ("Comentario")
      colBrand = 19; // Col S ("Marca")
      colObs = 20; // Col T ("Observación")
      headerRowIdx = 3; // El usuario menciona D3 como cabecera (fila 3)
    }

    // Asegurar los índices mínimos según el requerimiento exacto si la autodetección falla
    if (colQty === -1) colQty = 3;
    if (colWarehouse === -1) colWarehouse = 4;
    if (colCeco === -1) colCeco = 7;
    if (colName === -1) colName = 1;
    if (colPrice === -1) colPrice = 5;
    if (colComment === -1) colComment = 18;
    if (colBrand === -1) colBrand = 19;
    if (colObs === -1) colObs = 20;

    const rows: ParsedRow[] = [];
    let skippedHeaders = 0;

    // 2. Extraer datos a partir de la fila siguiente a los headers
    for (let rowIndex = headerRowIdx + 1; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);

      const articleName = getCellText(row.getCell(colName).value);
      const quantity = getCellNumber(row.getCell(colQty).value);

      // Extraer datos adicionales basados en legacy (colBrand, colObs, colComment)
      let brand = colBrand !== -1 ? getCellText(row.getCell(colBrand).value) : undefined;
      let observations = colObs !== -1 ? getCellText(row.getCell(colObs).value) : "";
      let comments = colComment !== -1 ? getCellText(row.getCell(colComment).value) : "";
      let fullDescription = [observations, comments].filter(Boolean).join(" - ");

      // Saltar filas vacías, totales (ej. TOTAL) o sub-headers adicionales
      if (!articleName) continue;
      if (articleName.toUpperCase().includes("TOTAL")) continue;
      if (isHeaderRow(articleName)) {
        skippedHeaders++;
        continue;
      }
      if (quantity <= 0) continue;

      const warehouseName = colWarehouse !== -1 ? getCellText(row.getCell(colWarehouse).value) || "BODEGA GENERAL" : "BODEGA GENERAL";
      const unitPrice = colPrice !== -1 ? getCellNumber(row.getCell(colPrice).value) : undefined;
      const centerCode = colCeco !== -1 ? getCellText(row.getCell(colCeco).value) : undefined;

      rows.push({
        articleName,
        quantity,
        warehouseName,
        centerCode: centerCode || undefined,
        unitPrice: unitPrice !== undefined ? unitPrice : 0,
        brand: brand || "Genérica",
        observations: fullDescription || "Ingreso por Cuadratura",
      });
    }

    if (rows.length === 0) {
      throw new Error(
        `No se encontraron filas válidas en la hoja «${worksheet.name}» (columnas mapeadas según cabeceras en fila ${headerRowIdx}). ` +
          `Revise que debajo de "Descripción" haya nombres de artículos, y bajo "Cantidad" valores mayores a 0. ` +
          `(Hojas en el archivo devueltas: ${sheetNames})`,
      );
    }

    return rows;
  }

  async importFromExcel(fileBytes: Uint8Array, userId: string): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBytes as never);

    const parsedRows = this.parseRows(workbook);
    if (parsedRows.length === 0) {
      throw new Error("El archivo no contiene filas válidas para importar");
    }

    let createdArticles = 0;
    let createdWarehouses = 0;
    let updatedStockRows = 0;
    let createdCenters = 0;

    const seenArticleByName = new Map<string, { id: string; code: string }>();
    const seenWarehouseByName = new Map<string, { id: string; code: string }>();
    const seenCostCenterByName = new Map<string, { id: string }>();

    await this.prisma.$transaction(async (tx) => {
      // 1. Procesar Centros de Costo (BodegaCostCenter)
      // *NOTA: En el nuevo sistema ya NO se hace deleteMany() inicial aquí para ser fiel a legacy.
      // (Para borrar todo se usa la pantalla "Maestros -> Limpiar Tablas" - cleanAllBodegaData)

      const centersRaw = parsedRows
        .map((r) => r.centerCode)
        .filter((v): v is string => !!v)
        .map((v) => v.trim());
      const centersUnique = Array.from(new Set(centersRaw));

      for (const centerName of centersUnique) {
        let center = await tx.bodegaCostCenter.findFirst({
          where: { name: { equals: centerName, mode: "insensitive" } },
          select: { id: true, code: true },
        });

        if (!center) {
          const baseCode = normalizeCode(centerName, "CC").slice(0, 22);
          let code = baseCode;
          let suffix = 1;
          while (await tx.bodegaCostCenter.findUnique({ where: { code }, select: { id: true } })) {
            code = `${baseCode}-${suffix}`.slice(0, 30);
            suffix += 1;
          }

          center = await tx.bodegaCostCenter.create({
            data: { code, name: centerName, isActive: true },
            select: { id: true, code: true },
          });
          createdCenters++;
        }
        seenCostCenterByName.set(centerName.toLowerCase(), center);
      }

      const movementBuckets = new Map<string, any[]>();
      const warehouseSkuOccurrence = new Map<string, Map<string, string>>();

      // 2. Procesar Artículos, Bodegas y Stock
      for (const row of parsedRows) {
        if (!row.articleName || row.quantity <= 0) continue;

        // Artículo
        const articleKey = row.articleName.toLowerCase();
        let article = seenArticleByName.get(articleKey);
        if (!article) {
          const existing = await tx.bodegaArticle.findFirst({
            where: { name: { equals: row.articleName, mode: "insensitive" } },
            select: { id: true, code: true },
          });

          if (existing) {
            article = existing;
          } else {
            const baseCode = normalizeCode(row.articleName, "ART").slice(0, 22);
            let code = baseCode;
            let suffix = 1;
            while (await tx.bodegaArticle.findUnique({ where: { code }, select: { id: true } })) {
              code = `${baseCode}-${suffix}`.slice(0, 30);
              suffix += 1;
            }

            article = await tx.bodegaArticle.create({
              data: {
                code,
                name: row.articleName,
                unit: "UNI",
                minimumStock: 0,
                articleType: "repuesto",
                brand: row.brand,
                description: row.observations,
                isActive: true,
              },
              select: { id: true, code: true },
            });
            createdArticles += 1;
          }
          seenArticleByName.set(articleKey, article);
        }

        // Bodega
        const warehouseKey = row.warehouseName.toLowerCase();
        let warehouse = seenWarehouseByName.get(warehouseKey);
        if (!warehouse) {
          const existing = await tx.bodegaWarehouse.findFirst({
            where: { name: { equals: row.warehouseName, mode: "insensitive" } },
            select: { id: true, code: true },
          });

          if (existing) {
            warehouse = existing;
          } else {
            const baseCode = normalizeCode(row.warehouseName, "BOD").slice(0, 22);
            let code = baseCode;
            let suffix = 1;
            while (await tx.bodegaWarehouse.findUnique({ where: { code }, select: { id: true } })) {
              code = `${baseCode}-${suffix}`.slice(0, 30);
              suffix += 1;
            }

            warehouse = await tx.bodegaWarehouse.create({
              data: { code, name: row.warehouseName, isActive: true },
              select: { id: true, code: true },
            });
            createdWarehouses += 1;
          }
          seenWarehouseByName.set(warehouseKey, warehouse);
        }

        // Stock (Físico) - Asegurar que el stock se marque como VERIFICADO al ser una cuadratura/carga inicial
        await tx.bodegaStock.upsert({
          where: { warehouseId_articleId: { warehouseId: warehouse.id, articleId: article.id } },
          create: {
            warehouseId: warehouse.id,
            articleId: article.id,
            quantity: row.quantity,
            reservedQuantity: 0,
            stockVerificado: row.quantity,
            stockNoVerificado: 0,
          },
          update: {
            quantity: { increment: row.quantity },
            stockVerificado: { increment: row.quantity },
          },
        });
        updatedStockRows += 1;

        // 3. Agrupación para Movimientos y Lotes
        // ... (resto del código igual)
        let targetRank = -1;
        let rank = 0;

        while (true) {
          const bucketKeyCheck = `${warehouse.id}|${rank}`;
          const currentBucket = movementBuckets.get(bucketKeyCheck) || [];

          const existingItem = currentBucket.find((i) => i.articleId === article!.id);

          if (existingItem) {
            if (existingItem.unitCost === (row.unitPrice || 0)) {
              targetRank = rank;
              break;
            } else {
              rank++;
            }
          } else {
            targetRank = rank;
            break;
          }
        }

        const bucketKey = `${warehouse.id}|${targetRank}`;
        if (!movementBuckets.has(bucketKey)) movementBuckets.set(bucketKey, []);

        const bucket = movementBuckets.get(bucketKey)!;
        const existingInBucket = bucket.find((i) => i.articleId === article!.id);

        if (existingInBucket) {
          existingInBucket.quantity += row.quantity;
        } else {
          bucket.push({
            articleId: article.id,
            quantity: row.quantity,
            unitCost: row.unitPrice || 0,
            observations: row.observations || "Ingreso por Cuadratura",
          });
        }
      }

      // 4. Crear los movimientos en base a los buckets
      let correlativoMovimiento = 1;
      for (const [key, items] of movementBuckets.entries()) {
        const [warehouseId, rankStr] = key.split("|");
        const rank = parseInt(rankStr, 10);
        const refWarehouse = await tx.bodegaWarehouse.findUnique({ where: { id: warehouseId } });

        const numeroDocumento = `ING-INVENTARIO-${String(correlativoMovimiento).padStart(4, "0")}`;
        // El folio mantiene el prefijo INV para distinguir que es una carga de cuadratura
        const folioMovimiento = `INV-${refWarehouse?.code || "BOD"}-${String(rank + 1).padStart(2, "0")}-${String(correlativoMovimiento).padStart(3, "0")}`;

        const movement = await tx.bodegaStockMovement.create({
          data: {
            folio: folioMovimiento,
            movementType: "INGRESO",
            status: "COMPLETADO", // Marcamos como COMPLETADO porque es una carga de inventario real (ya verificado)
            warehouseId,
            reason: "CARGA MASIVA CUADRATURA",
            externalReference: numeroDocumento,
            observations: `Carga Cuadratura - ${refWarehouse?.name} (Lote ${rank + 1}) - Doc Ref: ${numeroDocumento}`,
            createdBy: userId,
            appliedBy: userId,
            appliedAt: new Date(),
            approvedBy: userId,
            approvedAt: new Date(),
            items: {
              create: items.map((it) => ({
                articleId: it.articleId,
                quantity: it.quantity,
                unitCost: it.unitCost,
                initialBalance: it.quantity,
                currentBalance: it.quantity,
                observations: it.observations,
                // Campos de verificación para que se comporte como un ingreso activo
                cantidadVerificada: it.quantity,
                verificadoPorId: userId,
                fechaVerificacion: new Date(),
              })),
            },
          },
          include: { items: true },
        });

        // Crear Lotes explícitos
        let subIndex = 1;
        for (const mItem of movement.items) {
          await tx.bodegaLot.create({
            data: {
              code: `${folioMovimiento}-L${subIndex}`,
              warehouseId: warehouseId,
              articleId: mItem.articleId,
              sourceMovementItemId: mItem.id,
              initialQuantity: Number(mItem.quantity),
              currentQuantity: Number(mItem.quantity),
              unitCost: mItem.unitCost,
              status: "ACTIVO",
              createdBy: userId,
              observations: "Lote creado por importación masiva de cuadratura",
            },
          });
          subIndex++;
        }

        correlativoMovimiento++;
      }
    });

    return {
      processedRows: parsedRows.length,
      skippedRows: 0,
      createdArticles,
      createdWarehouses,
      updatedStockRows,
      createdCenters,
    };
  }

  async cleanAllBodegaData() {
    await this.prisma.$transaction(async (tx) => {
      await tx.bodegaReservation.deleteMany();
      await tx.bodegaSerialNumber.deleteMany();
      await tx.bodegaLot.deleteMany();
      await tx.bodegaStockMovementItem.deleteMany();
      await tx.bodegaStockMovement.deleteMany();
      await tx.bodegaInternalRequestLog.deleteMany();
      await tx.bodegaInternalRequestItem.deleteMany();
      await tx.bodegaInternalRequest.deleteMany();
      await tx.bodegaStock.deleteMany();
      await tx.bodegaArticle.deleteMany();
      await tx.bodegaWarehouse.deleteMany();
      await tx.bodegaCostCenter.deleteMany();

      const centKey = "BODEGA_MAESTROS_CENTROS_COSTO";
      await tx.appSetting.deleteMany({ where: { key: centKey } });
    });

    return { success: true };
  }
}

export const bodegaQuadratureImportService = new BodegaQuadratureImportService();
