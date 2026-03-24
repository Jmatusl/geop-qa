import { prisma } from "@/lib/prisma";

export interface BodegaReportsDashboardFilters {
  warehouseId?: string;
}

export class BodegaReportingService {
  private readonly prisma = prisma;

  async getDashboard(filters: BodegaReportsDashboardFilters = {}) {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const warehouseWhere = filters.warehouseId ? { warehouseId: filters.warehouseId } : {};

    const [totalArticles, activeReservations, recentMovements, lotsExpiringSoon, stockRows, movementByTypeRows, activeWarehouses] = await Promise.all([
      this.prisma.bodegaArticle.count({ where: { isActive: true } }),
      this.prisma.bodegaReservation.count({
        where: {
          status: "ACTIVA",
          ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        },
      }),
      this.prisma.bodegaTransaction.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
          ...warehouseWhere,
        },
      }),
      this.prisma.bodegaLot.count({
        where: {
          status: "ACTIVO",
          expirationDate: {
            gte: now,
            lte: in30Days,
          },
          ...warehouseWhere,
        },
      }),
      this.prisma.bodegaStock.findMany({
        where: warehouseWhere,
        select: {
          quantity: true,
          reservedQuantity: true,
          article: {
            select: {
              minimumStock: true,
            },
          },
        },
      }),
      this.prisma.bodegaTransaction.groupBy({
        by: ["type"],
        where: {
          createdAt: { gte: thirtyDaysAgo },
          ...warehouseWhere,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      }),
      this.prisma.bodegaTransaction.groupBy({
        by: ["warehouseId"],
        where: {
          createdAt: { gte: thirtyDaysAgo },
          ...warehouseWhere,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 5,
      }),
    ]);

    const lowStockCount = stockRows.reduce((acc, row) => {
      const quantity = Number(row.quantity);
      const reserved = Number(row.reservedQuantity);
      const minimum = Number(row.article.minimumStock);
      const available = quantity - reserved;
      return available < minimum ? acc + 1 : acc;
    }, 0);

    const warehouseIds = activeWarehouses.map((row) => row.warehouseId);
    const warehouseMap = warehouseIds.length
      ? await this.prisma.bodegaWarehouse.findMany({
          where: { id: { in: warehouseIds } },
          select: { id: true, code: true, name: true },
        })
      : [];

    const warehouseNameById = new Map(warehouseMap.map((row) => [row.id, row]));

    return {
      summary: {
        totalArticles,
        lowStockCount,
        lotsExpiringSoon,
        activeReservations,
        recentMovements,
      },
      movementByType: movementByTypeRows.map((row) => ({
        type: row.type,
        count: row._count.id,
      })),
      topWarehouses: activeWarehouses
        .map((row) => {
          const warehouse = warehouseNameById.get(row.warehouseId);
          if (!warehouse) return null;
          return {
            warehouseId: warehouse.id,
            warehouseCode: warehouse.code,
            warehouseName: warehouse.name,
            movements: row._count.id,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null),
    };
  }

  async getLowStockArticles(filters: BodegaReportsDashboardFilters = {}) {
    const warehouseWhere = filters.warehouseId ? { warehouseId: filters.warehouseId } : {};

    const stockRows = await this.prisma.bodegaStock.findMany({
      where: warehouseWhere,
      include: {
        article: {
          select: {
            id: true,
            code: true,
            name: true,
            minimumStock: true,
            unit: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        article: { name: "asc" },
      },
    });

    const lowStock = stockRows
      .map((row) => {
        const quantity = Number(row.quantity);
        const reserved = Number(row.reservedQuantity);
        const minimum = Number(row.article.minimumStock);
        const available = quantity - reserved;

        if (available < minimum) {
          return {
            id: row.id,
            articleId: row.article.id,
            articleCode: row.article.code,
            articleName: row.article.name,
            minimumStock: minimum,
            availableStock: available,
            unit: row.article.unit,
            warehouseId: row.warehouse.id,
            warehouseName: row.warehouse.name,
          };
        }
        return null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return lowStock;
  }
}

export const bodegaReportingService = new BodegaReportingService();
