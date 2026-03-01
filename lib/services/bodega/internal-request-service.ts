/**
 * Servicio: Solicitudes Internas de Bodega
 * Archivo: lib/services/bodega/internal-request-service.ts
 */

import { prisma } from "@/lib/prisma";
import type { BodegaInternalRequestFilters, CreateBodegaInternalRequestInput, UpdateBodegaInternalRequestInput } from "@/lib/validations/bodega-internal-request";
import { Prisma } from "@prisma/client";
import type { BodegaApproveRequestInput, BodegaDeliverRequestInput, BodegaPrepareRequestInput, BodegaRejectRequestInput } from "@/lib/validations/bodega-workflow";

export class BodegaBusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BodegaBusinessError";
  }
}

export class BodegaInternalRequestService {
  private readonly prisma = prisma;

  /**
   * Obtiene prefijo configurado de folio para solicitudes internas de bodega.
   * Compatibilidad:
   * - app_setting.key = "bodega_config" -> { folio: { prefix: "BI" } }
   */
  private async getRequestFolioPrefix(): Promise<string> {
    try {
      const setting = await this.prisma.appSetting.findUnique({
        where: { key: "bodega_config" },
        select: { value: true },
      });

      const config = setting?.value as Record<string, unknown> | null | undefined;
      const folio = config?.folio as Record<string, unknown> | undefined;
      const prefix = folio?.prefix;

      if (typeof prefix === "string" && prefix.trim().length > 0) {
        return prefix.trim().toUpperCase();
      }
    } catch {
      // Si falla lectura de configuración, se usa fallback local.
    }

    return "BI";
  }

  /**
   * Genera folio incremental del tipo BI-0001.
   */
  private async generateFolio(): Promise<string> {
    const prefix = await this.getRequestFolioPrefix();

    const lastRequest = await this.prisma.bodegaInternalRequest.findFirst({
      where: {
        folio: {
          startsWith: `${prefix}-`,
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
      select: { folio: true },
    });

    if (!lastRequest) {
      return `${prefix}-0001`;
    }

    const match = lastRequest.folio.match(/-(\d+)$/);
    const lastNumber = match ? parseInt(match[1], 10) : 0;
    const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;

    return `${prefix}-${nextNumber.toString().padStart(4, "0")}`;
  }

  async create(data: CreateBodegaInternalRequestInput, userId: string): Promise<{ id: string; folio: string }> {
    const warehouse = await this.prisma.bodegaWarehouse.findUnique({
      where: { id: data.warehouseId },
      select: { id: true, isActive: true },
    });

    if (!warehouse || !warehouse.isActive) {
      throw new BodegaBusinessError("La bodega seleccionada no existe o está inactiva");
    }

    const articleIds = [...new Set(data.items.map((item) => item.articleId))];
    const articles = await this.prisma.bodegaArticle.findMany({
      where: {
        id: { in: articleIds },
        isActive: true,
      },
      select: { id: true },
    });

    if (articles.length !== articleIds.length) {
      throw new BodegaBusinessError("Uno o más artículos no existen o están inactivos");
    }

    const folio = await this.generateFolio();

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.bodegaInternalRequest.create({
        data: {
          folio,
          statusCode: "PENDIENTE",
          warehouseId: data.warehouseId,
          title: data.title,
          description: data.description,
          priority: data.priority,
          requiredDate: data.requiredDate,
          observations: data.observations,
          requestedBy: userId,
          createdBy: userId,
        },
      });

      await tx.bodegaInternalRequestItem.createMany({
        data: data.items.map((item, index) => ({
          requestId: request.id,
          articleId: item.articleId,
          quantity: new Prisma.Decimal(item.quantity),
          observations: item.observations,
          displayOrder: index,
        })),
      });

      await tx.bodegaInternalRequestLog.create({
        data: {
          requestId: request.id,
          action: "CREADA",
          description: "Solicitud interna creada",
          metadata: {
            previousStatus: null,
            newStatus: "PENDIENTE",
            itemsCount: data.items.length,
          },
          createdBy: userId,
        },
      });

      return { id: request.id, folio: request.folio };
    });
  }

  async getById(id: string) {
    return this.prisma.bodegaInternalRequest.findUnique({
      where: { id },
      include: {
        status: true,
        warehouse: true,
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          include: {
            article: true,
            reservations: true,
          },
          orderBy: { displayOrder: "asc" },
        },
        logs: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async update(id: string, data: UpdateBodegaInternalRequestInput, userId: string): Promise<void> {
    const request = await this.prisma.bodegaInternalRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!request) {
      throw new BodegaBusinessError("La solicitud interna no existe");
    }

    if (!["PENDIENTE", "RECHAZADA"].includes(request.statusCode)) {
      throw new BodegaBusinessError("Solo se pueden editar solicitudes en estado PENDIENTE o RECHAZADA");
    }

    const warehouse = await this.prisma.bodegaWarehouse.findUnique({
      where: { id: data.warehouseId },
      select: { id: true, isActive: true },
    });

    if (!warehouse || !warehouse.isActive) {
      throw new BodegaBusinessError("La bodega seleccionada no existe o está inactiva");
    }

    const articleIds = [...new Set(data.items.map((item) => item.articleId))];
    const activeArticles = await this.prisma.bodegaArticle.findMany({
      where: {
        id: { in: articleIds },
        isActive: true,
      },
      select: { id: true },
    });

    if (activeArticles.length !== articleIds.length) {
      throw new BodegaBusinessError("Uno o más artículos no existen o están inactivos");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bodegaInternalRequest.update({
        where: { id },
        data: {
          warehouseId: data.warehouseId,
          title: data.title,
          description: data.description,
          priority: data.priority,
          requiredDate: data.requiredDate,
          observations: data.observations,
        },
      });

      await tx.bodegaReservation.deleteMany({
        where: {
          requestItem: {
            requestId: id,
          },
        },
      });

      await tx.bodegaStockMovementItem.deleteMany({
        where: {
          requestItem: {
            requestId: id,
          },
        },
      });

      await tx.bodegaInternalRequestItem.deleteMany({
        where: { requestId: id },
      });

      await tx.bodegaInternalRequestItem.createMany({
        data: data.items.map((item, index) => ({
          requestId: id,
          articleId: item.articleId,
          quantity: new Prisma.Decimal(item.quantity),
          observations: item.observations,
          displayOrder: index,
        })),
      });

      await tx.bodegaInternalRequestLog.create({
        data: {
          requestId: id,
          action: "ACTUALIZADA",
          description: "Solicitud interna actualizada",
          metadata: {
            previousStatus: request.statusCode,
            newStatus: request.statusCode,
            itemsCount: data.items.length,
          },
          createdBy: userId,
        },
      });
    });
  }

  async list(filters: BodegaInternalRequestFilters) {
    const { page, pageSize, search, statusCode, warehouseId, priority, requestedBy, sortBy, sortOrder } = filters;

    const skip = (page - 1) * pageSize;

    const where: Prisma.BodegaInternalRequestWhereInput = {
      ...(statusCode ? { statusCode } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(priority ? { priority } : {}),
      ...(requestedBy ? { requestedBy } : {}),
      ...(search
        ? {
            OR: [{ folio: { contains: search, mode: "insensitive" } }, { title: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }],
          }
        : {}),
    };

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(`${filters.startDate}T00:00:00.000Z`);
      if (filters.endDate) where.createdAt.lte = new Date(`${filters.endDate}T23:59:59.999Z`);
    }

    const orderByMap: Record<string, Prisma.BodegaInternalRequestOrderByWithRelationInput> = {
      createdAt: { createdAt: sortOrder },
      requiredDate: { requiredDate: sortOrder },
      folio: { folio: sortOrder },
      priority: { priority: sortOrder },
    };

    const orderBy = orderByMap[sortBy] || { createdAt: "desc" };

    const [total, data] = await Promise.all([
      this.prisma.bodegaInternalRequest.count({ where }),
      this.prisma.bodegaInternalRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          status: true,
          warehouse: true,
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              items: true,
              logs: true,
            },
          },
        },
      }),
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

  async getStats(filters: { requestedBy?: string }) {
    const { requestedBy } = filters;
    const where: Prisma.BodegaInternalRequestWhereInput = {
      ...(requestedBy ? { requestedBy } : {}),
    };

    const [total, pendientes, aprobadas, rechazadas, enPreparacion, entregadas, urgente, alta, normal, baja] = await Promise.all([
      this.prisma.bodegaInternalRequest.count({ where }),
      this.prisma.bodegaInternalRequest.count({ where: { ...where, statusCode: "PENDIENTE" } }),
      this.prisma.bodegaInternalRequest.count({ where: { ...where, statusCode: "APROBADA" } }),
      this.prisma.bodegaInternalRequest.count({ where: { ...where, statusCode: "RECHAZADA" } }),
      this.prisma.bodegaInternalRequest.count({ where: { ...where, statusCode: "EN_PREPARACION" } }),
      this.prisma.bodegaInternalRequest.count({ where: { ...where, statusCode: "ENTREGADA" } }),
      this.prisma.bodegaInternalRequest.count({ where: { ...where, priority: "URGENTE" } }),
      this.prisma.bodegaInternalRequest.count({ where: { ...where, priority: "ALTA" } }),
      this.prisma.bodegaInternalRequest.count({ where: { ...where, priority: "NORMAL" } }),
      this.prisma.bodegaInternalRequest.count({ where: { ...where, priority: "BAJA" } }),
    ]);

    // Lógica de tiempo promedio (placeholder por ahora, se puede mejorar con query raw si es necesario)
    // En un sistema real, se calcularía la diferencia entre createdAt y updatedAt para entregadas.
    const tiempoPromedioHoras = 0;

    return {
      general: {
        total,
        pendientes,
        aprobadas,
        rechazadas,
        enPreparacion,
        entregadas,
      },
      enProceso: pendientes + aprobadas + enPreparacion,
      completadas: entregadas,
      pendientesAprobacion: pendientes,
      pendientesPreparacion: aprobadas + enPreparacion, // Aprobadas necesitan preparación
      rendimiento: {
        tiempoPromedioHoras,
      },
      porPrioridad: {
        urgente,
        alta,
        normal,
        baja,
      },
    };
  }

  async approve(id: string, data: BodegaApproveRequestInput, userId: string): Promise<void> {
    const request = await this.prisma.bodegaInternalRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!request) {
      throw new BodegaBusinessError("La solicitud interna no existe");
    }

    if (!["PENDIENTE", "RECHAZADA"].includes(request.statusCode)) {
      throw new BodegaBusinessError("Solo se pueden aprobar solicitudes en estado PENDIENTE o RECHAZADA");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bodegaInternalRequest.update({
        where: { id },
        data: {
          statusCode: "APROBADA",
          observations: data.observations ?? request.observations,
        },
      });

      await tx.bodegaInternalRequestLog.create({
        data: {
          requestId: id,
          action: "APROBADA",
          description: "Solicitud interna aprobada",
          metadata: {
            previousStatus: request.statusCode,
            newStatus: "APROBADA",
            observations: data.observations,
          },
          createdBy: userId,
        },
      });
    });
  }

  async reject(id: string, data: BodegaRejectRequestInput, userId: string): Promise<void> {
    const request = await this.prisma.bodegaInternalRequest.findUnique({ where: { id } });

    if (!request) {
      throw new BodegaBusinessError("La solicitud interna no existe");
    }

    if (!["PENDIENTE", "APROBADA", "PARCIAL"].includes(request.statusCode)) {
      throw new BodegaBusinessError("No es posible rechazar la solicitud en su estado actual");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bodegaInternalRequest.update({
        where: { id },
        data: {
          statusCode: "RECHAZADA",
          observations: data.reason,
        },
      });

      await tx.bodegaInternalRequestLog.create({
        data: {
          requestId: id,
          action: "RECHAZADA",
          description: "Solicitud interna rechazada",
          metadata: {
            previousStatus: request.statusCode,
            newStatus: "RECHAZADA",
            reason: data.reason,
          },
          createdBy: userId,
        },
      });
    });
  }

  async prepare(id: string, data: BodegaPrepareRequestInput, userId: string): Promise<void> {
    const request = await this.prisma.bodegaInternalRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!request) {
      throw new BodegaBusinessError("La solicitud interna no existe");
    }

    if (!["APROBADA", "PARCIAL"].includes(request.statusCode)) {
      throw new BodegaBusinessError("Solo se pueden preparar solicitudes en estado APROBADA o PARCIAL");
    }

    await this.prisma.$transaction(async (tx) => {
      const movementFolio = `BM-${Date.now()}`;

      const movement = await tx.bodegaStockMovement.create({
        data: {
          folio: movementFolio,
          warehouseId: request.warehouseId,
          requestId: request.id,
          movementType: "SALIDA",
          status: "PENDIENTE",
          reason: "Preparación de solicitud interna",
          observations: data.observations,
          createdBy: userId,
        },
      });

      await tx.bodegaStockMovementItem.createMany({
        data: request.items
          .filter((item) => Number(item.quantity) > Number(item.deliveredQuantity))
          .map((item) => ({
            movementId: movement.id,
            requestItemId: item.id,
            articleId: item.articleId,
            quantity: new Prisma.Decimal(item.quantity).minus(item.deliveredQuantity),
          })),
      });

      await tx.bodegaInternalRequestLog.create({
        data: {
          requestId: id,
          action: "PREPARADA",
          description: "Solicitud preparada para entrega",
          metadata: {
            previousStatus: request.statusCode,
            newStatus: request.statusCode,
            movementId: movement.id,
            movementFolio,
            observations: data.observations,
          },
          createdBy: userId,
        },
      });
    });
  }

  async deliver(id: string, data: BodegaDeliverRequestInput, userId: string): Promise<void> {
    const request = await this.prisma.bodegaInternalRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!request) {
      throw new BodegaBusinessError("La solicitud interna no existe");
    }

    if (!["APROBADA", "PARCIAL"].includes(request.statusCode)) {
      throw new BodegaBusinessError("Solo se pueden entregar solicitudes en estado APROBADA o PARCIAL");
    }

    await this.prisma.$transaction(async (tx) => {
      if (data.deliverAll) {
        for (const item of request.items) {
          await tx.bodegaInternalRequestItem.update({
            where: { id: item.id },
            data: { deliveredQuantity: item.quantity },
          });
        }
      }

      const refreshedItems = await tx.bodegaInternalRequestItem.findMany({
        where: { requestId: id },
      });

      const pending = refreshedItems.some((item) => Number(item.deliveredQuantity) < Number(item.quantity));
      const nextStatus = pending ? "PARCIAL" : "ENTREGADA";

      await tx.bodegaInternalRequest.update({
        where: { id },
        data: {
          statusCode: nextStatus,
          observations: data.observations ?? request.observations,
        },
      });

      await tx.bodegaStockMovement.updateMany({
        where: {
          requestId: id,
          status: "PENDIENTE",
        },
        data: {
          status: "APLICADO",
          approvedAt: new Date(),
          approvedBy: userId,
        },
      });

      await tx.bodegaInternalRequestLog.create({
        data: {
          requestId: id,
          action: nextStatus === "ENTREGADA" ? "ENTREGADA" : "PARCIAL",
          description: nextStatus === "ENTREGADA" ? "Solicitud entregada completamente" : "Solicitud entregada parcialmente",
          metadata: {
            previousStatus: request.statusCode,
            newStatus: nextStatus,
            observations: data.observations,
            deliverAll: data.deliverAll,
          },
          createdBy: userId,
        },
      });
    });
  }
}

export const bodegaInternalRequestService = new BodegaInternalRequestService();
