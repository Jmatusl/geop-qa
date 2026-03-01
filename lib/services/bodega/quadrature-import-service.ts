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

function getCellText(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "text" in value && typeof value.text === "string") return value.text.trim();
  return String(value).trim();
}

function getCellNumber(value: ExcelJS.CellValue) {
  if (typeof value === "number") return value;
  const text = getCellText(value).replace(/,/g, ".");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class BodegaQuadratureImportService {
  private readonly prisma = prisma;

  private parseRows(workbook: ExcelJS.Workbook): ParsedRow[] {
    // Buscar la hoja "Cuadratura" o usar la primera/segunda que parezca inventario
    const targetNames = ["Cuadratura", "cuadratura", "CUADRATURA", "Stock", "stock", "STOCK"];
    const worksheet = targetNames.reduce<ExcelJS.Worksheet | undefined>((found, name) => found ?? workbook.getWorksheet(name) ?? undefined, undefined) ?? workbook.worksheets[0];

    if (!worksheet) {
      throw new Error("El archivo no contiene hojas de datos");
    }

    const sheetNames = workbook.worksheets.map((ws) => ws.name).join(", ");

    // 1. Auto-detectar la fila de cabeceras y qué columna tiene cada tipo de dato.
    let headerRowIdx = -1;
    let colName = -1,
      colQty = -1,
      colWarehouse = -1,
      colPrice = -1,
      colCeco = -1;

    for (let r = 1; r <= Math.min(worksheet.rowCount, 30); r++) {
      const row = worksheet.getRow(r);
      for (let c = 1; c <= 20; c++) {
        const val = getCellText(row.getCell(c).value).toLowerCase();
        if (val.includes("descripción") || val.includes("descripcion") || val.includes("nombre") || val.includes("artículo") || val.includes("n° de parte") || val === "articulo") {
          headerRowIdx = r;
          colName = c;
          break;
        }
      }

      if (headerRowIdx !== -1) {
        // Encontramos el inicio de la tabla. Ahora detectar las otras columnas en esta misma fila.
        for (let c = 1; c <= 25; c++) {
          const val = getCellText(row.getCell(c).value).toLowerCase();
          if (val.includes("cantidad") || val.includes("stock") || val.includes("saldo")) colQty = c;
          if (val.includes("ubicación") || val.includes("ubicacion") || val.includes("bodega")) colWarehouse = c;
          if (val.includes("valor") || val.includes("precio") || val.includes("unit")) colPrice = c;
          if (val.includes("ceco") || val.includes("centro")) colCeco = c;
        }
        break; // Teniendo las columnas mapeadas, cortamos la búsqueda.
      }
    }

    if (colName === -1) {
      // Fallback estricto si no hay nada obvio (asumimos la estructura del archivo por defecto)
      colName = 2; // Col B
      colQty = 3; // Col C
      colWarehouse = 4; // Col D
      colPrice = 5; // Col E
      colCeco = 7; // Col G
      headerRowIdx = 3; // Empezamos a buscar desde la 4
    }

    // Fallback asegurando mínimo colQty
    if (colQty === -1) colQty = colName + 1;

    const rows: ParsedRow[] = [];
    let skippedHeaders = 0;

    // 2. Extraer datos a partir de la fila siguiente a los headers
    for (let rowIndex = headerRowIdx + 1; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);

      const articleName = getCellText(row.getCell(colName).value);
      const quantity = getCellNumber(row.getCell(colQty).value);

      // Saltar filas vacías, totales (ej. TOTAL) o sub-headers adicionales
      if (!articleName) continue;
      if (articleName.toUpperCase().includes("TOTAL")) continue;
      if (isHeaderRow(articleName)) {
        skippedHeaders++;
        continue;
      }
      if (quantity <= 0) continue;

      const warehouseName = colWarehouse !== -1 ? getCellText(row.getCell(colWarehouse).value) || "BODEGA GENERAL" : "BODEGA GENERAL";
      const unitPrice = colPrice !== -1 ? getCellNumber(row.getCell(colPrice).value) : 0;
      const centerCode = colCeco !== -1 ? getCellText(row.getCell(colCeco).value) : undefined;

      rows.push({
        articleName,
        quantity,
        warehouseName,
        centerCode: centerCode || undefined,
        unitPrice: unitPrice > 0 ? unitPrice : undefined,
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
      // 0. LIMPIEZA INICIAL: Eliminar todos los registros previos de Bodega para empezar de cero
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
      await tx.appSetting.deleteMany({ where: { key: "BODEGA_MAESTROS_CENTROS_COSTO" } });

      // 1. Procesar Centros de Costo (BodegaCostCenter)
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

        // Stock (Físico)
        await tx.bodegaStock.upsert({
          where: { warehouseId_articleId: { warehouseId: warehouse.id, articleId: article.id } },
          create: { warehouseId: warehouse.id, articleId: article.id, quantity: row.quantity, reservedQuantity: 0 },
          update: { quantity: { increment: row.quantity } },
        });
        updatedStockRows += 1;

        // 3. Agrupación para Movimientos (Lotes para evitar que un mismo movimiento tenga 2 veces el mismo artículo)
        if (!warehouseSkuOccurrence.has(warehouse.id)) {
          warehouseSkuOccurrence.set(warehouse.id, new Map());
        }

        let rank = 0;
        while (movementBuckets.has(`${warehouse.id}|${rank}`) && movementBuckets.get(`${warehouse.id}|${rank}`)?.some((i) => i.articleId === article!.id)) {
          rank++;
        }

        const bucketKey = `${warehouse.id}|${rank}`;
        if (!movementBuckets.has(bucketKey)) movementBuckets.set(bucketKey, []);

        movementBuckets.get(bucketKey)!.push({
          articleId: article.id,
          quantity: row.quantity,
          unitCost: row.unitPrice || 0,
          observations: row.observations || "Ingreso por Cuadratura",
        });
      }

      // 4. Crear los movimientos en base a los buckets
      let correlativoMovimiento = 1;
      for (const [key, items] of movementBuckets.entries()) {
        const [warehouseId, rankStr] = key.split("|");
        const rank = parseInt(rankStr, 10);
        const refWarehouse = await tx.bodegaWarehouse.findUnique({ where: { id: warehouseId } });

        const numeroDocumento = `ING-INVENTARIO-${String(correlativoMovimiento).padStart(4, "0")}`;
        const folioMovimiento = `INV-${refWarehouse?.code || "BOD"}-${String(rank + 1).padStart(2, "0")}-${String(correlativoMovimiento).padStart(3, "0")}`;

        const movement = await tx.bodegaStockMovement.create({
          data: {
            folio: folioMovimiento,
            movementType: "INGRESO",
            status: "APLICADO", // Se registra como ya aplicado en el inventario
            warehouseId,
            reason: "CARGA MASIVA CUADRATURA",
            observations: `Carga Cuadratura - ${refWarehouse?.name} (Lote ${rank + 1}) - Doc Ref: ${numeroDocumento}`,
            createdBy: userId,
            approvedBy: userId,
            approvedAt: new Date(),
            items: {
              create: items.map((it) => ({
                articleId: it.articleId,
                quantity: it.quantity,
                unitCost: it.unitCost,
              })),
            },
          },
          include: { items: true },
        });

        // Crear Lotes explícitos para que el inventario por lotes y reportes (StockGlobalTable) se cargue
        let subIndex = 1;
        for (const mItem of movement.items) {
          await tx.bodegaLot.create({
            data: {
              code: `${folioMovimiento}-L${subIndex}`,
              warehouseId: warehouseId,
              articleId: mItem.articleId,
              sourceMovementItemId: mItem.id,
              initialQuantity: mItem.quantity,
              currentQuantity: mItem.quantity,
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
