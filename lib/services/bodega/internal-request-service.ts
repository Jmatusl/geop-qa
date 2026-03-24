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
   * Obtiene la configuración general del módulo de bodega.
   */
  private async getGeneralConfig(): Promise<any> {
    try {
      const setting = await this.prisma.appSetting.findUnique({
        where: { key: "BODEGA_GENERAL_CONFIG" },
        select: { value: true, isActive: true },
      });
      return setting?.isActive ? (setting.value as any) : {};
    } catch {
      return {};
    }
  }

  /**
   * Genera folio incremental del tipo BI-0001.
   */
  private async generateFolio(): Promise<string> {
    const prefix = await this.getRequestFolioPrefix();

    const lastRequest = await this.prisma.bodegaTransaction.findFirst({
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
      // 1. Obtener configuración y permisos del usuario
      const configGeneral = await this.getGeneralConfig();
      const userRoles = await tx.userRole.findMany({
        where: { userId },
        include: { role: true },
      });
      const roleCodes = userRoles.map((ur: any) => ur.role.code);
      const canApprove = roleCodes.includes("ADMIN") || roleCodes.includes("BODEGA_ADMIN") || roleCodes.includes("BODEGA_SUPERVISOR");

      // 2. Determinar estados automáticos
      // Si solicita auto-aprobación y puede hacerlo, el estado inicial es APROBADA
      const isAutoApproved = data.autoAprobar && canApprove;

      // La entrega inmediata (autoCompletar) solo se ejecuta si:
      // a) Se solicita explícitamente Y el usuario tiene permisos
      // b) O si las reglas globales de sistema fuerzan auto-aprobación/entrega inmediata
      const shouldAutoDeliver = (data.autoCompletar && canApprove) || (data.autoAprobar && canApprove) || configGeneral.auto_aprobar_solicitudes === true || configGeneral.entrega_inmediata === true;

      const initialStatus = shouldAutoDeliver ? "PENDIENTE" : isAutoApproved ? "APROBADA" : "BORRADOR";

      const request = await tx.bodegaTransaction.create({
        data: {
          folio,
          type: "RETIRO",
          status: initialStatus,
          warehouseId: data.warehouseId,
          title: data.title,
          description: data.description,
          priority: data.priority,
          requiredDate: data.requiredDate,
          observations: data.observations,
          externalReference: data.externalReference,
          // metadatos: data.metadatos ?? undefined, // Ajustar si es necesario
          requestedBy: userId,
          createdBy: userId,
        },
      });

      await tx.bodegaTransactionItem.createMany({
        data: data.items.map((item, index) => ({
          transactionId: request.id,
          articleId: item.articleId,
          warehouseId: item.warehouseId || data.warehouseId,
          quantity: new Prisma.Decimal(item.quantity),
          observations: item.observations,
          // displayOrder: index, // Ajustar si es necesario
        })),
      });

      // Bitácora de creación
      await tx.bodegaTransactionLog.create({
        data: {
          transactionId: request.id,
          action: "CREADA",
          description: shouldAutoDeliver ? "Solicitud interna creada y auto-completada" : "Solicitud interna creada",
          metadata: {
            previousStatus: null,
            newStatus: initialStatus,
            itemsCount: data.items.length,
            autoCompletar: shouldAutoDeliver,
          },
          createdBy: userId,
        },
      });

      // Si se auto-aprobó pero NO se auto-entregó (según pedido del usuario)
      if (isAutoApproved && !shouldAutoDeliver) {
        await tx.bodegaTransactionLog.create({
          data: {
            transactionId: request.id,
            action: "APROBADA",
            description: "Solicitud interna aprobada automaticamente",
            metadata: { newStatus: "APROBADA" },
            createdBy: userId,
          },
        });
      }

      if (shouldAutoDeliver) {
        const createdItems = await tx.bodegaTransactionItem.findMany({ where: { transactionId: request.id } });
        const mappedItemsToDeliver = createdItems.map((ci: any) => ({
          articleId: ci.articleId,
          quantity: Number(ci.quantity),
          transactionItemId: ci.id,
          sourceTransactionItemId: null,
          bodegaEfectivaId: ci.warehouseId || data.warehouseId,
        }));

        await this.applyFifoEgreso(
          tx,
          data.warehouseId,
          request.id,
          request.folio,
          request.externalReference,
          mappedItemsToDeliver,
          userId,
          data.observations || "Proceso de retiro rápido auto-completado",
        );

        await tx.bodegaTransaction.update({
          where: { id: request.id },
          data: { status: "ENTREGADA" },
        });

        await tx.bodegaTransactionLog.createMany({
          data: [
            {
              transactionId: request.id,
              action: "APROBADA",
              description: isAutoApproved ? "Solicitud interna aprobada automaticamente" : "Aprobación automática (Entrega Inmediata)",
              metadata: { newStatus: "APROBADA" },
              createdBy: userId,
            },
            {
              transactionId: request.id,
              action: "ENTREGADA",
              description: "Entrega automática (Entrega Inmediata)",
              metadata: { newStatus: "ENTREGADA" },
              createdBy: userId,
            },
          ],
        });
      }

      return { id: request.id, folio: request.folio, status: shouldAutoDeliver ? "ENTREGADA" : isAutoApproved ? "APROBADA" : "BORRADOR" };
    });
  }

  private async generateMovementFolio(tx: any, movementType: string): Promise<string> {
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}`;
    const prefix = `${movementType}-${yearMonth}`;

    const lastMovement = await tx.bodegaTransaction.findFirst({
      where: { folio: { startsWith: `${prefix}-` } },
      orderBy: { folio: "desc" },
    });

    let nextNumber = 1;
    if (lastMovement) {
      const match = lastMovement.folio.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}-${nextNumber.toString().padStart(4, "0")}`;
  }

  private async applyFifoEgreso(
    tx: any,
    warehouseId: string,
    requestId: string,
    requestFolio: string,
    externalRef: string | null,
    itemsToDeliver: Array<{ articleId: string; quantity: number; transactionItemId: string; sourceTransactionItemId?: string | null; bodegaEfectivaId?: string | null }>,
    userId: string,
    observations: string,
  ) {
    const movementFolio = await this.generateMovementFolio(tx, "EGRESO_SOLICITUD");
    const movement = await tx.bodegaTransaction.create({
      data: {
        folio: movementFolio,
        warehouseId,
        type: "SALIDA",
        status: "EJECUTADO",
        reason: `Entrega de Solicitud (Ref: ${requestFolio}${externalRef ? ` [${externalRef}]` : ""})`,
        observations,
        createdBy: userId,
        appliedAt: new Date(),
        appliedBy: userId,
      },
    });

    await tx.bodegaTransactionLog.create({
      data: {
        transactionId: movement.id,
        action: "CREATE",
        description: "Movimiento simplificado de egreso generado automáticamente por entrega de solicitud.",
        metadata: {
          requestId,
          requestFolio,
          externalReference: externalRef,
          executionMode: "SIMPLIFICADO",
          automaticExecution: true,
          automaticSource: "ENTREGA_SOLICITUD",
        },
        createdBy: userId,
      },
    });

    const requestValuation = new Map<string, { quantity: number; totalCost: number }>();

    const accumulateRequestValuation = (requestItemId: string, quantity: number, unitCost: number | null) => {
      if (!requestItemId || quantity <= 0 || unitCost === null || Number.isNaN(unitCost)) return;

      const current = requestValuation.get(requestItemId) || { quantity: 0, totalCost: 0 };
      current.quantity += quantity;
      current.totalCost += quantity * unitCost;
      requestValuation.set(requestItemId, current);
    };

    const decrementWarehouseStock = async (sourceWarehouseId: string, articleId: string, quantity: number) => {
      if (quantity <= 0) return;

      await tx.bodegaStock.upsert({
        where: { warehouseId_articleId: { warehouseId: sourceWarehouseId, articleId } },
        create: {
          warehouseId: sourceWarehouseId,
          articleId,
          quantity: -quantity,
          stockVerificado: -quantity,
          stockNoVerificado: 0,
          reservedQuantity: 0,
        },
        update: {
          quantity: { decrement: quantity },
          stockVerificado: { decrement: quantity },
        },
      });
    };

    const consumeFromWarehouse = async (sourceWarehouseId: string, articleId: string, requestedQty: number, requestItemId: string) => {
      if (requestedQty <= 0) return 0;

      const [availableStocks, stockRow] = await Promise.all([
        tx.bodegaTransactionItem.findMany({
          where: {
            articleId,
            transaction: {
              warehouseId: sourceWarehouseId,
              status: { in: ["EJECUTADO", "COMPLETADO", "COMPLETADA", "APLICADO", "APLICADA"] },
              type: { in: ["INGRESO", "INGRESO_TRANSFERENCIA", "AJUSTE", "DEVOLUCION"] },
            },
            currentBalance: { gt: 0 },
          },
          orderBy: { createdAt: "asc" },
        }),
        tx.bodegaStock.findUnique({
          where: { warehouseId_articleId: { warehouseId: sourceWarehouseId, articleId } },
          select: {
            quantity: true,
            reservedQuantity: true,
          },
        }),
      ]);

      let remainingQty = requestedQty;
      let consumedQty = 0;
      const trackedAvailable = availableStocks.reduce((acc: number, stock: any) => acc + Number(stock.currentBalance || 0), 0);
      const stockAvailable = stockRow ? Math.max(0, Number(stockRow.quantity) - Number(stockRow.reservedQuantity)) : 0;
      const syntheticAvailable = Math.max(0, stockAvailable - trackedAvailable);

      for (const stock of availableStocks) {
        if (remainingQty <= 0) break;
        const toTake = Math.min(Number(stock.currentBalance), remainingQty);

        await tx.bodegaTransactionItem.update({
          where: { id: stock.id },
          data: { currentBalance: { decrement: toTake } },
        });

        const lot = await tx.bodegaLot.findFirst({
          where: { sourceMovementItemId: stock.id },
        });

        if (lot) {
          const newQty = Math.max(0, Number(lot.currentQuantity) - toTake);
          await tx.bodegaLot.update({
            where: { id: lot.id },
            data: {
              currentQuantity: newQty,
              status: newQty <= 0 ? "AGOTADO" : lot.status,
            },
          });
        }

        await tx.bodegaTransactionItem.create({
          data: {
            transactionId: movement.id,
            articleId,
            warehouseId: sourceWarehouseId,
            quantity: toTake,
            unitCost: stock.unitCost,
            sourceTransactionItemId: stock.id,
            initialBalance: 0,
            currentBalance: 0,
          },
        });

        accumulateRequestValuation(requestItemId, toTake, stock.unitCost ? Number(stock.unitCost) : null);

        remainingQty -= toTake;
        consumedQty += toTake;
      }

      if (remainingQty > 0 && syntheticAvailable > 0) {
        const syntheticQty = Math.min(remainingQty, syntheticAvailable);

        await tx.bodegaTransactionItem.create({
          data: {
            transactionId: movement.id,
            articleId,
            warehouseId: sourceWarehouseId,
            quantity: syntheticQty,
            unitCost: null,
            sourceTransactionItemId: null,
            initialBalance: 0,
            currentBalance: 0,
          },
        });

        remainingQty -= syntheticQty;
        consumedQty += syntheticQty;
      }

      await decrementWarehouseStock(sourceWarehouseId, articleId, consumedQty);

      return remainingQty;
    };

    for (const reqItem of itemsToDeliver) {
      if (reqItem.quantity <= 0) continue;

      const effectiveWarehouseId = reqItem.bodegaEfectivaId || warehouseId;

      if (reqItem.sourceTransactionItemId && !reqItem.sourceTransactionItemId.startsWith("STOCK-")) {
        const sourceItem = await tx.bodegaTransactionItem.findUnique({ where: { id: reqItem.sourceTransactionItemId } });
        if (sourceItem) {
          const sourceWarehouseId = sourceItem.warehouseId || effectiveWarehouseId;

          await tx.bodegaTransactionItem.update({
            where: { id: sourceItem.id },
            data: { currentBalance: { decrement: reqItem.quantity } },
          });

          const lot = await tx.bodegaLot.findFirst({
            where: { sourceMovementItemId: sourceItem.id },
          });
          if (lot) {
            const newQty = Math.max(0, Number(lot.currentQuantity) - reqItem.quantity);
            await tx.bodegaLot.update({
              where: { id: lot.id },
              data: {
                currentQuantity: newQty,
                status: newQty <= 0 ? "AGOTADO" : lot.status,
              },
            });
          }

          await tx.bodegaTransactionItem.create({
            data: {
              transactionId: movement.id,
              articleId: reqItem.articleId,
              warehouseId: sourceWarehouseId,
              quantity: reqItem.quantity,
              unitCost: sourceItem.unitCost,
              sourceTransactionItemId: sourceItem.id,
              initialBalance: 0,
              currentBalance: 0,
            },
          });

          accumulateRequestValuation(reqItem.transactionItemId, reqItem.quantity, sourceItem.unitCost ? Number(sourceItem.unitCost) : null);

          await decrementWarehouseStock(sourceWarehouseId, reqItem.articleId, reqItem.quantity);
          continue;
        }
      }

      if (reqItem.sourceTransactionItemId?.startsWith("STOCK-")) {
        const syntheticSourceWarehouseId = reqItem.bodegaEfectivaId || effectiveWarehouseId;

        await tx.bodegaTransactionItem.create({
          data: {
            transactionId: movement.id,
            articleId: reqItem.articleId,
            warehouseId: syntheticSourceWarehouseId,
            quantity: reqItem.quantity,
            unitCost: null,
            sourceTransactionItemId: null,
            initialBalance: 0,
            currentBalance: 0,
          },
        });

        await decrementWarehouseStock(syntheticSourceWarehouseId, reqItem.articleId, reqItem.quantity);
        continue;
      }

      let remainingQty = reqItem.quantity;

      remainingQty = await consumeFromWarehouse(effectiveWarehouseId, reqItem.articleId, remainingQty, reqItem.transactionItemId);

      if (remainingQty > 0) {
        const alternativeWarehouses = await tx.bodegaStock.findMany({
          where: {
            articleId: reqItem.articleId,
            warehouseId: { not: effectiveWarehouseId },
            quantity: { gt: 0 },
          },
          include: {
            warehouse: {
              select: {
                id: true,
                code: true,
                isActive: true,
              },
            },
          },
          orderBy: [{ warehouseId: "asc" }],
        });

        for (const altStock of alternativeWarehouses) {
          if (remainingQty <= 0) break;
          if (!altStock.warehouse?.isActive || altStock.warehouse.code === "TRANSITO") continue;

          remainingQty = await consumeFromWarehouse(altStock.warehouseId, reqItem.articleId, remainingQty, reqItem.transactionItemId);
        }
      }

      if (remainingQty > 0) {
        // En caso de stock negativo (permitido por legacy), crear item sin padre
        await tx.bodegaTransactionItem.create({
          data: {
            transactionId: movement.id,
            articleId: reqItem.articleId,
            warehouseId: effectiveWarehouseId,
            quantity: remainingQty,
            unitCost: null,
            sourceTransactionItemId: null,
            initialBalance: 0,
            currentBalance: 0,
          },
        });

        await decrementWarehouseStock(effectiveWarehouseId, reqItem.articleId, remainingQty);
      }
    }

    for (const [requestItemId, valuation] of requestValuation.entries()) {
      if (valuation.quantity <= 0) continue;

      await tx.bodegaTransactionItem.update({
        where: { id: requestItemId },
        data: {
          unitCost: valuation.totalCost / valuation.quantity,
        },
      });
    }
  }

  async getById(id: string) {
    return this.prisma.bodegaTransaction.findUnique({
      where: { id },
      include: {
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
            article: {
              select: {
                id: true,
                code: true,
                name: true,
                unit: true,
              },
            },
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
    const request = await this.prisma.bodegaTransaction.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!request) {
      throw new BodegaBusinessError("La solicitud interna no existe");
    }

    const editableStatuses = ["BORRADOR", "PENDIENTE", "RECHAZADA"];
    if (!editableStatuses.includes(request.status)) {
      throw new BodegaBusinessError("Solo se pueden editar solicitudes en estado BORRADOR, PENDIENTE o RECHAZADA");
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
      await tx.bodegaTransaction.update({
        where: { id },
        data: {
          warehouseId: data.warehouseId,
          title: data.title,
          description: data.description,
          priority: data.priority,
          requiredDate: data.requiredDate,
          observations: data.observations,
          externalReference: data.externalReference,
          // metadatos: data.metadatos ?? undefined,
        },
      });

      await tx.bodegaReservation.deleteMany({
        where: {
          transactionItemId: {
            in: request.items.map(i => i.id)
          }
        },
      });

      await tx.bodegaTransactionItem.deleteMany({
        where: { transactionId: id },
      });

      await tx.bodegaTransactionItem.createMany({
        data: data.items.map((item, index) => ({
          transactionId: id,
          articleId: item.articleId,
          warehouseId: item.warehouseId || data.warehouseId,
          quantity: new Prisma.Decimal(item.quantity),
          observations: item.observations,
        })),
      });

      await tx.bodegaTransactionLog.create({
        data: {
          transactionId: id,
          action: "ACTUALIZADA",
          description: "Solicitud interna actualizada",
          metadata: {
            previousStatus: request.status,
            newStatus: request.status,
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

    const where: Prisma.BodegaTransactionWhereInput = {
      type: "RETIRO",
      ...(statusCode ? { status: statusCode } : {}),
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

    const orderByMap: Record<string, Prisma.BodegaTransactionOrderByWithRelationInput> = {
      createdAt: { createdAt: sortOrder },
      requiredDate: { requiredDate: sortOrder },
      folio: { folio: sortOrder },
      priority: { priority: sortOrder },
    };

    const orderBy = orderByMap[sortBy] || { createdAt: "desc" };

    const [total, data] = await Promise.all([
      this.prisma.bodegaTransaction.count({ where }),
      this.prisma.bodegaTransaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
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
    const where: Prisma.BodegaTransactionWhereInput = {
      type: "RETIRO",
      ...(requestedBy ? { requestedBy } : {}),
    };

    const [total, pendientes, aprobadas, rechazadas, enPreparacion, entregadas, urgente, alta, normal, baja] = await Promise.all([
      this.prisma.bodegaTransaction.count({ where }),
      this.prisma.bodegaTransaction.count({ where: { ...where, status: "PENDIENTE" } }),
      this.prisma.bodegaTransaction.count({ where: { ...where, status: "APROBADA" } }),
      this.prisma.bodegaTransaction.count({ where: { ...where, status: "RECHAZADA" } }),
      this.prisma.bodegaTransaction.count({ where: { ...where, status: "EN_PREPARACION" } }),
      this.prisma.bodegaTransaction.count({ where: { ...where, status: "ENTREGADA" } }),
      this.prisma.bodegaTransaction.count({ where: { ...where, priority: "URGENTE" } }),
      this.prisma.bodegaTransaction.count({ where: { ...where, priority: "ALTA" } }),
      this.prisma.bodegaTransaction.count({ where: { ...where, priority: "NORMAL" } }),
      this.prisma.bodegaTransaction.count({ where: { ...where, priority: "BAJA" } }),
    ]);

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
      pendientesPreparacion: aprobadas + enPreparacion,
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
    const request = await this.prisma.bodegaTransaction.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!request) {
      throw new BodegaBusinessError("La solicitud interna no existe");
    }

    if (!["PENDIENTE", "RECHAZADA"].includes(request.status)) {
      throw new BodegaBusinessError("Solo se pueden aprobar solicitudes en estado PENDIENTE o RECHAZADA");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bodegaTransaction.update({
        where: { id },
        data: {
          status: "APROBADA",
          observations: data.observations ?? request.observations,
        },
      });

      await tx.bodegaTransactionLog.create({
        data: {
          transactionId: id,
          action: "APROBADA",
          description: data.observations ? `Solicitud aprobada: ${data.observations}` : "Solicitud interna aprobada",
          metadata: {
            previousStatus: request.status,
            newStatus: "APROBADA",
            observations: data.observations,
          },
          createdBy: userId,
        },
      });
    });
  }

  async reject(id: string, data: BodegaRejectRequestInput, userId: string): Promise<void> {
    const request = await this.prisma.bodegaTransaction.findUnique({ where: { id } });

    if (!request) {
      throw new BodegaBusinessError("La solicitud interna no existe");
    }

    if (!["PENDIENTE", "APROBADA", "PARCIAL"].includes(request.status)) {
      throw new BodegaBusinessError("No es posible rechazar la solicitud en su estado actual");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bodegaTransaction.update({
        where: { id },
        data: {
          status: "RECHAZADA",
          observations: data.reason,
        },
      });

      await tx.bodegaTransactionLog.create({
        data: {
          transactionId: id,
          action: "RECHAZADA",
          description: `Solicitud rechazada: ${data.reason}`,
          metadata: {
            previousStatus: request.status,
            newStatus: "RECHAZADA",
            reason: data.reason,
          },
          createdBy: userId,
        },
      });
    });
  }

  async prepare(id: string, data: BodegaPrepareRequestInput, userId: string): Promise<void> {
    const request = await this.prisma.bodegaTransaction.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!request) {
      throw new BodegaBusinessError("La solicitud interna no existe");
    }

    if (!["APROBADA", "PARCIAL"].includes(request.status)) {
      throw new BodegaBusinessError("Solo se pueden preparar solicitudes en estado APROBADA o PARCIAL");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bodegaTransaction.update({
        where: { id },
        data: {
          status: "PREPARADA",
          observations: data.observations ?? request.observations,
        },
      });

      await tx.bodegaTransactionLog.create({
        data: {
          transactionId: id,
          action: "PREPARADA",
          description: data.observations ? `Inicio de preparación: ${data.observations}` : "Inicio de preparación: Solicitud verificada en bodega, lista para retiro físico",
          metadata: {
            previousStatus: request.status,
            newStatus: "PREPARADA",
            observations: data.observations,
          },
          createdBy: userId,
        },
      });
    });
  }

  async deliver(id: string, data: BodegaDeliverRequestInput, userId: string): Promise<void> {
    const request = await this.prisma.bodegaTransaction.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!request) {
      throw new BodegaBusinessError("La solicitud interna no existe");
    }

    if (!["APROBADA", "PARCIAL", "PREPARADA", "LISTA_PARA_ENTREGA"].includes(request.status)) {
      throw new BodegaBusinessError("Solo se pueden entregar solicitudes en estado APROBADA, PARCIAL, PREPARADA o LISTA_PARA_ENTREGA");
    }

    await this.prisma.$transaction(async (tx) => {
      let itemsToDeliver: Array<{
        articleId: string;
        quantity: number;
        transactionItemId: string;
        sourceTransactionItemId?: string | null;
        bodegaEfectivaId?: string | null;
      }> = [];

      if (data.deliverAll) {
        itemsToDeliver = request.items
          .filter((item) => Number(item.quantity) > Number(item.deliveredQuantity))
          .map((item) => ({
            articleId: item.articleId,
            quantity: Number(item.quantity) - Number(item.deliveredQuantity),
            transactionItemId: item.id,
            sourceTransactionItemId: null,
            bodegaEfectivaId: item.warehouseId || request.warehouseId,
          }));

        for (const item of request.items) {
          await tx.bodegaTransactionItem.update({
            where: { id: item.id },
            data: { deliveredQuantity: item.quantity },
          });
        }
      } else if (data.items && data.items.length > 0) {
        for (const inputItem of data.items) {
          const transItem = request.items.find((i) => i.articleId === inputItem.articleId);
          if (transItem) {
            const deliveryAmt = Math.min(inputItem.quantity, Number(transItem.quantity) - Number(transItem.deliveredQuantity));
            if (deliveryAmt > 0) {
              itemsToDeliver.push({
                articleId: transItem.articleId,
                quantity: deliveryAmt,
                transactionItemId: transItem.id,
                sourceTransactionItemId: inputItem.sourceMovementItemId,
                bodegaEfectivaId: inputItem.bodegaEfectivaId || transItem.warehouseId || request.warehouseId,
              });
              await tx.bodegaTransactionItem.update({
                where: { id: transItem.id },
                data: { deliveredQuantity: { increment: deliveryAmt } },
              });
            }
          }
        }
      }

      if (itemsToDeliver.length > 0) {
        const movementObs = data.observations || `Retiro de artículos para solicitud ${request.folio}${data.deliverAll ? " (Carga Masiva)" : ""}`;
        await this.applyFifoEgreso(tx, request.warehouseId, request.id, request.folio, request.externalReference, itemsToDeliver, userId, movementObs);
      }

      const refreshedItems = await tx.bodegaTransactionItem.findMany({
        where: { transactionId: id },
      });

      const pending = refreshedItems.some((item) => Number(item.deliveredQuantity) < Number(item.quantity));
      const nextStatus = pending ? "PARCIAL" : "LISTA_PARA_ENTREGA";

      await tx.bodegaTransaction.update({
        where: { id },
        data: {
          status: nextStatus,
          observations: data.observations ?? request.observations,
        },
      });

      const logDescription = data.deliverAll
        ? data.observations
          ? `Retiro Total (Masivo): ${data.observations}`
          : "Retiro físico total completado (Carga Masiva)"
        : data.observations
          ? `Retiro de Artículos: ${data.observations}`
          : "Retiro parcial de artículos registrado";

      await tx.bodegaTransactionLog.create({
        data: {
          transactionId: id,
          action: nextStatus === "LISTA_PARA_ENTREGA" ? "RETIRO_COMPLETADO" : "RETIRO_PARCIAL",
          description: logDescription,
          metadata: {
            previousStatus: request.status,
            newStatus: nextStatus,
            observations: data.observations,
            deliverAll: data.deliverAll,
          },
          createdBy: userId,
        },
      });
    });
  }

  /**
   * confirmEntrega — Registra la entrega final al receptor con firma digital.
   * Solo aplica cuando la solicitud está en estado LISTA_PARA_ENTREGA.
   */
  async confirmEntrega(
    id: string,
    data: {
      receptorNombre: string;
      receptorRut?: string;
      firmaReceptor: string; // base64 del canvas de firma
      fotoEvidencia?: string; // base64 de la foto de evidencia
      observations?: string;
    },
    userId: string,
  ): Promise<void> {
    const request = await this.prisma.bodegaTransaction.findUnique({
      where: { id },
    });

    if (!request) {
      throw new BodegaBusinessError("La solicitud interna no existe");
    }

    if (request.status !== "LISTA_PARA_ENTREGA") {
      throw new BodegaBusinessError("Solo se puede confirmar la entrega de solicitudes en estado LISTA_PARA_ENTREGA");
    }

    await this.prisma.$transaction(async (tx) => {
      // Obtener nombre del usuario que entrega
      const deliveredByUser = await tx.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      const deliveredByName = deliveredByUser ? `${deliveredByUser.firstName} ${deliveredByUser.lastName}` : userId;

      // Guardar datos de la entrega en metadatos de la solicitud (estructura plana para PDF)
      await tx.bodegaTransaction.update({
        where: { id },
        data: {
          status: "ENTREGADA",
          observations: data.observations ?? request.observations,
          metadata: {
            receptorNombre: data.receptorNombre,
            receptorRut: data.receptorRut ?? null,
            firmaReceptor: data.firmaReceptor,
            fotoEvidencia: data.fotoEvidencia ?? null,
            observaciones: data.observations ?? null,
            confirmedAt: new Date().toISOString(),
            deliveredByUserId: userId,
            deliveredByName,
          },
        },
      });

      await tx.bodegaTransactionLog.create({
        data: {
          transactionId: id,
          action: "ENTREGA_CONFIRMADA",
          description: data.observations
            ? `Entrega final registrada: ${data.observations}`
            : `Solicitud entregada exitosamente a ${data.receptorNombre}${data.receptorRut ? ` (RUT: ${data.receptorRut})` : ""}`,
          metadata: {
            previousStatus: "LISTA_PARA_ENTREGA",
            newStatus: "ENTREGADA",
            receptorNombre: data.receptorNombre,
            receptorRut: data.receptorRut,
            observations: data.observations,
            firmaAdjuntada: !!data.firmaReceptor,
            fotoAdjuntada: !!data.fotoEvidencia,
          },
          createdBy: userId,
        },
      });
    });
  }

  async sendToApproval(id: string, userId: string): Promise<void> {
    const request = await this.prisma.bodegaTransaction.findUnique({
      where: { id },
    });

    if (!request) {
      throw new BodegaBusinessError("La solicitud interna no existe");
    }

    if (request.status !== "BORRADOR") {
      throw new BodegaBusinessError("Solo se pueden enviar para aprobación solicitudes en estado BORRADOR");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bodegaTransaction.update({
        where: { id },
        data: {
          status: "PENDIENTE",
        },
      });

      await tx.bodegaTransactionLog.create({
        data: {
          transactionId: id,
          action: "ENVIADA",
          description: "Solicitud interna enviada para aprobación",
          metadata: {
            previousStatus: "BORRADOR",
            newStatus: "PENDIENTE",
          },
          createdBy: userId,
        },
      });
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const request = await this.prisma.bodegaTransaction.findUnique({
      where: { id },
    });

    if (!request) {
      throw new BodegaBusinessError("La solicitud interna no existe");
    }

    if (!["BORRADOR", "RECHAZADA", "ANULADA"].includes(request.status)) {
      throw new BodegaBusinessError("No es posible eliminar una solicitud que ya está siendo procesada");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bodegaTransactionLog.deleteMany({ where: { transactionId: id } });
      await tx.bodegaTransactionItem.deleteMany({ where: { transactionId: id } });
      await tx.bodegaTransaction.delete({ where: { id } });
    });
  }
}

export const bodegaInternalRequestService = new BodegaInternalRequestService();
