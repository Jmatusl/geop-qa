import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CreateBodegaMovementInput } from "@/lib/validations/bodega-movement";
import type { CreateBodegaLotInput, CreateBodegaSerialNumberInput } from "@/lib/validations/bodega-lot-series";

export interface BodegaMovementListFilters {
  page: number;
  pageSize: number;
  search?: string;
  movementType?: string;
  status?: string;
  warehouseId?: string;
}

export interface BodegaLotListFilters {
  page: number;
  pageSize: number;
  search?: string;
  warehouseId?: string;
  articleId?: string;
  status?: string;
}

export interface BodegaSeriesListFilters {
  page: number;
  pageSize: number;
  search?: string;
  warehouseId?: string;
  status?: string;
  articleId?: string;
}

export interface BodegaStockListFilters {
  page: number;
  pageSize: number;
  search?: string;
  warehouseId?: string;
}

export class BodegaMovementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BodegaMovementError";
  }
}

export class BodegaStockMovementService {
  private readonly prisma = prisma;

  async listMovements(filters: BodegaMovementListFilters) {
    const { page, pageSize, search, movementType, status, warehouseId } = filters;

    const where: Prisma.BodegaStockMovementWhereInput = {
      ...(movementType ? { movementType } : {}),
      ...(status ? { status } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(search
        ? {
            OR: [
              { folio: { contains: search, mode: "insensitive" } },
              { reason: { contains: search, mode: "insensitive" } },
              { observations: { contains: search, mode: "insensitive" } },
              { warehouse: { code: { contains: search, mode: "insensitive" } } },
              { warehouse: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.bodegaStockMovement.findMany({
        where,
        include: {
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          request: {
            select: {
              id: true,
              folio: true,
              statusCode: true,
            },
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bodegaStockMovement.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getMovementById(id: string) {
    return this.prisma.bodegaStockMovement.findUnique({
      where: { id },
      include: {
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        request: {
          select: {
            id: true,
            folio: true,
            statusCode: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        items: {
          include: {
            article: {
              select: {
                id: true,
                code: true,
                name: true,
                unit: true,
              },
            },
          },
          orderBy: [{ createdAt: "asc" }],
        },
      },
    });
  }

  async createMovement(input: CreateBodegaMovementInput, userId: string) {
    const { movementType, warehouseId, articleId, quantity, reason, observations } = input;

    const [warehouse, article] = await Promise.all([
      this.prisma.bodegaWarehouse.findUnique({
        where: { id: warehouseId },
        select: { id: true, isActive: true },
      }),
      this.prisma.bodegaArticle.findUnique({
        where: { id: articleId },
        select: { id: true, isActive: true },
      }),
    ]);

    if (!warehouse || !warehouse.isActive) {
      throw new BodegaMovementError("La bodega seleccionada no existe o está inactiva");
    }

    if (!article || !article.isActive) {
      throw new BodegaMovementError("El artículo seleccionado no existe o está inactivo");
    }

    return this.prisma.$transaction(async (tx) => {
      const folio = `BM-${Date.now()}`;

      const movement = await tx.bodegaStockMovement.create({
        data: {
          folio,
          warehouseId,
          movementType,
          status: "PENDIENTE",
          reason: reason || null,
          observations: observations || null,
          createdBy: userId,
        },
      });

      await tx.bodegaStockMovementItem.create({
        data: {
          movementId: movement.id,
          articleId,
          quantity,
        },
      });

      return movement;
    });
  }

  async applyMovement(movementId: string, userId: string, observations?: string) {
    const movement = await this.prisma.bodegaStockMovement.findUnique({
      where: { id: movementId },
      include: {
        items: {
          select: {
            id: true,
            articleId: true,
            quantity: true,
          },
        },
      },
    });

    if (!movement) {
      throw new BodegaMovementError("Movimiento no encontrado");
    }

    if (movement.status === "APLICADO") {
      throw new BodegaMovementError("El movimiento ya fue aplicado");
    }

    if (movement.items.length === 0) {
      throw new BodegaMovementError("El movimiento no tiene ítems para aplicar");
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of movement.items) {
        const stock = await tx.bodegaStock.findUnique({
          where: {
            warehouseId_articleId: {
              warehouseId: movement.warehouseId,
              articleId: item.articleId,
            },
          },
        });

        const currentQuantity = Number(stock?.quantity ?? 0);
        const currentReserved = Number(stock?.reservedQuantity ?? 0);
        const movementQty = Number(item.quantity);

        let nextQuantity = currentQuantity;
        let nextReserved = currentReserved;

        if (movement.movementType === "INGRESO") {
          nextQuantity = currentQuantity + movementQty;
        } else if (movement.movementType === "SALIDA") {
          if (currentQuantity < movementQty) {
            throw new BodegaMovementError("Stock insuficiente para aplicar salida");
          }
          nextQuantity = currentQuantity - movementQty;
        } else if (movement.movementType === "AJUSTE") {
          nextQuantity = currentQuantity + movementQty;
        } else if (movement.movementType === "RESERVA") {
          const available = currentQuantity - currentReserved;
          if (available < movementQty) {
            throw new BodegaMovementError("Stock disponible insuficiente para reservar");
          }
          nextReserved = currentReserved + movementQty;
        } else if (movement.movementType === "LIBERACION") {
          if (currentReserved < movementQty) {
            throw new BodegaMovementError("No existe cantidad reservada suficiente para liberar");
          }
          nextReserved = currentReserved - movementQty;
        }

        await tx.bodegaStock.upsert({
          where: {
            warehouseId_articleId: {
              warehouseId: movement.warehouseId,
              articleId: item.articleId,
            },
          },
          create: {
            warehouseId: movement.warehouseId,
            articleId: item.articleId,
            quantity: nextQuantity,
            reservedQuantity: nextReserved,
          },
          update: {
            quantity: nextQuantity,
            reservedQuantity: nextReserved,
          },
        });
      }

      const updated = await tx.bodegaStockMovement.update({
        where: { id: movementId },
        data: {
          status: "APLICADO",
          approvedAt: new Date(),
          approvedBy: userId,
          observations: observations ? `${movement.observations || ""}\n${observations}`.trim() : movement.observations,
        },
      });

      return updated;
    });
  }

  async listStock(filters: BodegaStockListFilters) {
    const { page, pageSize, search, warehouseId } = filters;

    const where: Prisma.BodegaStockWhereInput = {
      ...(warehouseId ? { warehouseId } : {}),
      ...(search
        ? {
            OR: [
              { article: { code: { contains: search, mode: "insensitive" } } },
              { article: { name: { contains: search, mode: "insensitive" } } },
              { warehouse: { code: { contains: search, mode: "insensitive" } } },
              { warehouse: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.bodegaStock.findMany({
        where,
        include: {
          article: {
            select: { id: true, code: true, name: true, unit: true, minimumStock: true },
          },
          warehouse: {
            select: { id: true, code: true, name: true },
          },
        },
        orderBy: [{ updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bodegaStock.count({ where }),
    ]);

    return {
      data: rows.map((row) => {
        const quantity = Number(row.quantity);
        const reservedQuantity = Number(row.reservedQuantity);
        const availableQuantity = quantity - reservedQuantity;
        const minimumStock = Number(row.article.minimumStock);
        return {
          id: row.id,
          quantity,
          reservedQuantity,
          availableQuantity,
          updatedAt: row.updatedAt,
          article: {
            ...row.article,
            minimumStock,
            lowStock: availableQuantity < minimumStock,
          },
          warehouse: row.warehouse,
        };
      }),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async quickSearchInventory(search: string, warehouseId?: string) {
    const rows = await this.prisma.bodegaStock.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        ...(search
          ? {
              OR: [
                { article: { code: { contains: search, mode: "insensitive" } } },
                { article: { name: { contains: search, mode: "insensitive" } } },
                { article: { description: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        article: {
          select: { id: true, code: true, name: true, description: true, unit: true, minimumStock: true },
        },
        warehouse: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: [{ article: { name: "asc" } }],
      take: 250,
    });

    const grouped = new Map<
      string,
      {
        id: string;
        codigo: string;
        nombre: string;
        descripcion: string | null;
        unidad: string;
        stockTotal: number;
        bodegas: Array<{
          bodegaId: string;
          bodegaCodigo: string;
          bodegaNombre: string;
          cantidadDisponible: number;
          stockMinimo: number;
          bajoStock: boolean;
        }>;
      }
    >();

    for (const row of rows) {
      const key = row.article.id;
      const quantity = Number(row.quantity);
      const reserved = Number(row.reservedQuantity);
      const available = quantity - reserved;
      const min = Number(row.article.minimumStock);

      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          id: row.article.id,
          codigo: row.article.code,
          nombre: row.article.name,
          descripcion: row.article.description,
          unidad: row.article.unit,
          stockTotal: available,
          bodegas: [
            {
              bodegaId: row.warehouse.id,
              bodegaCodigo: row.warehouse.code,
              bodegaNombre: row.warehouse.name,
              cantidadDisponible: available,
              stockMinimo: min,
              bajoStock: available < min,
            },
          ],
        });
      } else {
        existing.stockTotal += available;
        existing.bodegas.push({
          bodegaId: row.warehouse.id,
          bodegaCodigo: row.warehouse.code,
          bodegaNombre: row.warehouse.name,
          cantidadDisponible: available,
          stockMinimo: min,
          bajoStock: available < min,
        });
      }
    }

    return {
      total: grouped.size,
      resultados: Array.from(grouped.values()),
    };
  }

  async listLots(filters: BodegaLotListFilters) {
    const { page, pageSize, search, warehouseId, articleId, status } = filters;

    const where: Prisma.BodegaLotWhereInput = {
      ...(warehouseId ? { warehouseId } : {}),
      ...(articleId ? { articleId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { article: { code: { contains: search, mode: "insensitive" } } },
              { article: { name: { contains: search, mode: "insensitive" } } },
              { warehouse: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.bodegaLot.findMany({
        where,
        include: {
          article: {
            select: {
              id: true,
              code: true,
              name: true,
              unit: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          _count: {
            select: { serialNumbers: true },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bodegaLot.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        loteCode: row.code,
        movementType: row.sourceMovementItemId ? "GENERADO" : "MANUAL",
        status: row.status,
        quantity: row.currentQuantity,
        initialQuantity: row.initialQuantity,
        unitCost: row.unitCost,
        expirationDate: row.expirationDate,
        createdAt: row.createdAt,
        article: row.article,
        warehouse: row.warehouse,
        serialCount: row._count.serialNumbers,
      })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async createLot(input: CreateBodegaLotInput, userId: string) {
    const [warehouse, article] = await Promise.all([
      this.prisma.bodegaWarehouse.findUnique({ where: { id: input.warehouseId }, select: { id: true, isActive: true } }),
      this.prisma.bodegaArticle.findUnique({ where: { id: input.articleId }, select: { id: true, isActive: true } }),
    ]);

    if (!warehouse || !warehouse.isActive) {
      throw new BodegaMovementError("La bodega seleccionada no existe o está inactiva");
    }

    if (!article || !article.isActive) {
      throw new BodegaMovementError("El artículo seleccionado no existe o está inactivo");
    }

    return this.prisma.bodegaLot.create({
      data: {
        code: input.code,
        warehouseId: input.warehouseId,
        articleId: input.articleId,
        initialQuantity: input.initialQuantity,
        currentQuantity: input.currentQuantity ?? input.initialQuantity,
        unitCost: input.unitCost,
        manufactureDate: input.manufactureDate,
        expirationDate: input.expirationDate,
        provider: input.provider,
        invoiceNumber: input.invoiceNumber,
        status: input.status ?? "ACTIVO",
        observations: input.observations,
        createdBy: userId,
      },
    });
  }

  async listSeries(filters: BodegaSeriesListFilters) {
    const { page, pageSize, search, warehouseId, status, articleId } = filters;

    const where: Prisma.BodegaSerialNumberWhereInput = {
      ...(warehouseId ? { warehouseId } : {}),
      ...(status ? { status } : {}),
      ...(articleId ? { articleId } : {}),
      ...(search
        ? {
            OR: [
              { serialNumber: { contains: search, mode: "insensitive" } },
              { lot: { code: { contains: search, mode: "insensitive" } } },
              { article: { code: { contains: search, mode: "insensitive" } } },
              { article: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.bodegaSerialNumber.findMany({
        where,
        include: {
          article: {
            select: {
              id: true,
              code: true,
              name: true,
              unit: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          lot: {
            select: {
              id: true,
              code: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bodegaSerialNumber.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        serialNumber: row.serialNumber,
        sourceFolio: row.lot.code,
        status: row.status,
        quantity: "1",
        createdAt: row.createdAt,
        article: row.article,
        warehouse: row.warehouse,
      })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async createSerialNumber(input: CreateBodegaSerialNumberInput, userId: string) {
    const lot = await this.prisma.bodegaLot.findUnique({
      where: { id: input.lotId },
      select: { id: true, articleId: true, warehouseId: true, status: true },
    });

    if (!lot) {
      throw new BodegaMovementError("El lote seleccionado no existe");
    }

    if (lot.status !== "ACTIVO") {
      throw new BodegaMovementError("Solo se pueden registrar series en lotes activos");
    }

    return this.prisma.bodegaSerialNumber.create({
      data: {
        lotId: input.lotId,
        warehouseId: lot.warehouseId,
        articleId: lot.articleId,
        serialNumber: input.serialNumber,
        status: input.status ?? "DISPONIBLE",
        notes: input.notes,
        createdBy: userId,
      },
    });
  }

  async getArticleMovements(articleId: string, warehouseId?: string) {
    const where: Prisma.BodegaStockMovementItemWhereInput = {
      articleId,
      movement: {
        status: "APLICADO",
        ...(warehouseId ? { warehouseId } : {}),
      },
    };

    const items = await this.prisma.bodegaStockMovementItem.findMany({
      where,
      include: {
        movement: {
          include: {
            warehouse: {
              select: { name: true, code: true },
            },
            creator: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: {
        movement: {
          createdAt: "desc",
        },
      },
      take: 50,
    });

    return items.map((item) => ({
      id: item.id,
      movementId: item.movementId,
      folio: item.movement.folio,
      tipo: item.movement.movementType,
      cantidad: Number(item.quantity),
      fecha: item.movement.createdAt,
      bodega: item.movement.warehouse.name,
      bodegaCodigo: item.movement.warehouse.code,
      usuario: `${item.movement.creator.firstName} ${item.movement.creator.lastName}`,
      motivo: item.movement.reason,
      observaciones: item.movement.observations,
    }));
  }
}

export const bodegaStockMovementService = new BodegaStockMovementService();
