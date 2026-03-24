/**
 * Servicio: Gestión Unificada de Transacciones de Bodega
 * Archivo: lib/services/bodega/transaction-service.ts
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { 
  CreateBodegaTransactionInput, 
  BodegaTransactionFilters,
  UpdateBodegaTransactionInput
} from "@/lib/validations/bodega-transaction";

export class BodegaTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BodegaTransactionError";
  }
}

export class BodegaTransactionService {
  private readonly prisma = prisma;

  private readonly movementOnlyTypes = ["INGRESO", "SALIDA", "AJUSTE", "DEVOLUCION", "TRANSFERENCIA"] as const;

  private async generateFolio(type: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `${type.toUpperCase()}-${year}${month}`;

    const lastTransaction = await this.prisma.bodegaTransaction.findFirst({
      where: { folio: { startsWith: `${prefix}-` } },
      orderBy: { folio: "desc" },
      select: { folio: true },
    });

    let sequence = 1;
    if (lastTransaction) {
      const parts = lastTransaction.folio.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, "0")}`;
  }

  async list(filters: BodegaTransactionFilters) {
    const { 
      page, pageSize, search, type, status, warehouseId, requestedBy, 
      startDate, endDate, sortBy, sortOrder 
    } = filters;

    const where: Prisma.BodegaTransactionWhereInput = {
      ...(type ? { type } : { type: { in: [...this.movementOnlyTypes, "RETIRO"] } }),
      ...(status ? { status } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(requestedBy ? { requestedBy } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        }
      } : {}),
      ...(search ? {
        OR: [
          { folio: { contains: search, mode: "insensitive" } },
          { title: { contains: search, mode: "insensitive" } },
          { externalReference: { contains: search, mode: "insensitive" } },
          { quotationNumber: { contains: search, mode: "insensitive" } },
          { deliveryGuide: { contains: search, mode: "insensitive" } },
        ]
      } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.bodegaTransaction.count({ where }),
      this.prisma.bodegaTransaction.findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { [sortBy || "createdAt"]: sortOrder || "desc" },
        include: {
          warehouse: { select: { name: true, code: true } },
          targetWarehouse: { select: { name: true, code: true } },
          requester: { select: { firstName: true, lastName: true, email: true } },
          creator: { select: { firstName: true, lastName: true } },
          items: {
            select: {
              quantity: true,
              unitCost: true,
            }
          },
          _count: { select: { items: true } }
        }
      })
    ]);

    // Calcular totales por transacción para el listado de forma segura y limpiar textos
    const formattedItems = items.map(item => {
      // Usamos any para evadir validaciones estrictas de tipos de Prisma Decimal en el cálculo
      const rawItems = (item as any).items || [];
      
      const totalItems = rawItems.reduce((acc: number, curr: any) => {
        const q = curr.quantity ? parseFloat(curr.quantity.toString()) : 0;
        return acc + q;
      }, 0);

      const totalPrice = rawItems.reduce((acc: number, curr: any) => {
        const q = curr.quantity ? parseFloat(curr.quantity.toString()) : 0;
        const c = curr.unitCost ? parseFloat(curr.unitCost.toString()) : 0;
        return acc + (q * c);
      }, 0);

      // Limpiar prefijo "JUSTIFICACIÓN:" de reason u observations de forma más agresiva
      // Se detecta el prefijo en cualquier lugar del inicio o como palabra clave
      const stripJustification = (text: string | null | undefined) => {
        if (!text) return null;
        return text.replace(/^(JUSTIFICACIÓN|JUSTIFICACION):\s*/i, "").trim();
      };

      return {
        ...item,
        reason: stripJustification(item.reason),
        observations: stripJustification(item.observations),
        totalItems,
        totalPrice,
        // No enviamos todos los items detallados en el listado para ahorrar ancho de banda
        // Pero mantenemos la estructura que espera el componente si fuera necesario
        items: undefined 
      };
    });

    return {
      items: formattedItems,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    };
  }

  async listOperational(filters: BodegaTransactionFilters) {
    const {
      page, pageSize, search, type, status, warehouseId, requestedBy,
      startDate, endDate, sortBy, sortOrder,
    } = filters;

    const where: Prisma.BodegaTransactionWhereInput = {
      type: type ? type : { in: [...this.movementOnlyTypes] },
      ...(status ? { status } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(requestedBy ? { requestedBy } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        }
      } : {}),
      ...(search ? {
        OR: [
          { folio: { contains: search, mode: "insensitive" } },
          { title: { contains: search, mode: "insensitive" } },
          { externalReference: { contains: search, mode: "insensitive" } },
          { quotationNumber: { contains: search, mode: "insensitive" } },
          { deliveryGuide: { contains: search, mode: "insensitive" } },
        ]
      } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.bodegaTransaction.count({ where }),
      this.prisma.bodegaTransaction.findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { [sortBy || "createdAt"]: sortOrder || "desc" },
        include: {
          warehouse: { select: { name: true, code: true } },
          targetWarehouse: { select: { name: true, code: true } },
          requester: { select: { firstName: true, lastName: true, email: true } },
          creator: { select: { firstName: true, lastName: true } },
          items: {
            select: {
              quantity: true,
              unitCost: true,
            }
          },
          _count: { select: { items: true } }
        }
      })
    ]);

    const formattedItems = items.map(item => {
      const rawItems = (item as any).items || [];

      const totalItems = rawItems.reduce((acc: number, curr: any) => {
        const q = curr.quantity ? parseFloat(curr.quantity.toString()) : 0;
        return acc + q;
      }, 0);

      const totalPrice = rawItems.reduce((acc: number, curr: any) => {
        const q = curr.quantity ? parseFloat(curr.quantity.toString()) : 0;
        const c = curr.unitCost ? parseFloat(curr.unitCost.toString()) : 0;
        return acc + (q * c);
      }, 0);

      const stripJustification = (text: string | null | undefined) => {
        if (!text) return null;
        return text.replace(/^(JUSTIFICACIÓN|JUSTIFICACION):\s*/i, "").trim();
      };

      return {
        ...item,
        reason: stripJustification(item.reason),
        observations: stripJustification(item.observations),
        totalItems,
        totalPrice,
        items: undefined,
      };
    });

    return {
      items: formattedItems,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    };
  }

  async getById(id: string) {
    const transaction = await this.prisma.bodegaTransaction.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            article: { select: { id: true, code: true, name: true, unit: true } }
          }
        },
        logs: {
          orderBy: { createdAt: "desc" },
          include: { creator: { select: { firstName: true, lastName: true } } }
        },
        warehouse: true,
        targetWarehouse: true,
        requester: true,
        creator: true,
        approver: true,
        applier: true
      }
    });

    if (!transaction) throw new BodegaTransactionError("La transacción no existe.");
    return transaction;
  }

  async create(data: CreateBodegaTransactionInput, userId: string) {
    const folio = await this.generateFolio(data.type);
    const isSimplifiedAutomaticTransaction = data.autoApprove || data.autoComplete;

    return await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.bodegaTransaction.create({
        data: {
          folio,
          type: data.type,
          status: data.status,
          title: data.title,
          description: data.description,
          warehouseId: data.warehouseId,
          targetWarehouseId: data.targetWarehouseId,
          priority: data.priority,
          requiredDate: data.requiredDate,
          requestedBy: data.requestedById, 
          responsable: data.responsableName,
          externalReference: data.externalReference,
          quotationNumber: data.quotationNumber,
          deliveryGuide: data.deliveryGuide,
          observations: data.observations,
          createdBy: userId,
          metadata: (data.metadata as Prisma.InputJsonValue) || Prisma.JsonNull,
          items: {
            create: data.items.map(item => ({
              articleId: item.articleId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              observations: item.observations,
              sourceTransactionItemId: item.sourceTransactionItemId,
            }))
          }
        },
        include: { items: true }
      });

      await tx.bodegaTransactionLog.create({
        data: {
          transactionId: transaction.id,
          action: "CREATE",
          description: isSimplifiedAutomaticTransaction
            ? `Transacción simplificada de tipo ${data.type} creada con procesamiento automático.`
            : "Transacción creada.",
          metadata: isSimplifiedAutomaticTransaction
            ? {
                executionMode: "SIMPLIFICADO",
                automaticExecution: true,
                automaticSource: data.autoComplete ? "AUTO_COMPLETE" : "AUTO_APPROVE",
                autoApprove: data.autoApprove === true,
                autoComplete: data.autoComplete === true,
              }
            : undefined,
          createdBy: userId,
        }
      });

      // AUTO-PROCESAMIENTO
      if (data.autoApprove) {
        await this.internalApprove(tx, transaction.id, userId);
      }

      if (data.autoComplete) {
        // Si no estaba aprobada y lo requería, se aprueba primero internamente
        if (data.type === "RETIRO" && !data.autoApprove) {
          await this.internalApprove(tx, transaction.id, userId);
        }
        await this.internalComplete(tx, transaction.id, userId);
      }

      // Devolver objeto actualizado
      const finalResult = await tx.bodegaTransaction.findUnique({
        where: { id: transaction.id },
        include: { items: true }
      });
      if (!finalResult) throw new BodegaTransactionError("Error al recuperar la transacción recién creada.");
      return finalResult;
    });
  }

  async approve(id: string, userId: string, observations?: string) {
    return await this.prisma.$transaction(async (tx) => {
      return await this.internalApprove(tx, id, userId, observations);
    });
  }

  async complete(id: string, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      return await this.internalComplete(tx, id, userId);
    });
  }

  // --- LÓGICA INTERNA TRANSACCIONAL ---

  private async internalApprove(tx: Prisma.TransactionClient, id: string, userId: string, observations?: string) {
    const transaction = await tx.bodegaTransaction.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!transaction || transaction.status !== "PENDIENTE") {
      throw new BodegaTransactionError("No se puede aprobar la transacción en su estado actual.");
    }

    if (transaction.type === "RETIRO") {
      for (const item of transaction.items) {
        await tx.bodegaReservation.create({
          data: {
            transactionId: id,
            transactionItemId: item.id,
            warehouseId: transaction.warehouseId,
            articleId: item.articleId,
            quantity: item.quantity,
            status: "ACTIVA",
            createdBy: userId
          }
        });
        
        await tx.bodegaStock.upsert({
          where: { warehouseId_articleId: { warehouseId: transaction.warehouseId, articleId: item.articleId } },
          create: { warehouseId: transaction.warehouseId, articleId: item.articleId, quantity: 0, reservedQuantity: item.quantity },
          update: { reservedQuantity: { increment: item.quantity } }
        });
      }
    }

    const updated = await tx.bodegaTransaction.update({
      where: { id },
      data: { status: "APROBADA", approvedBy: userId, approvedAt: new Date() },
      include: { items: true }
    });

    await tx.bodegaTransactionLog.create({
      data: {
        transactionId: id,
        action: "APPROVE",
        description: observations || "Aprobación automatizada o manual.",
        createdBy: userId,
      }
    });

    return updated;
  }

  private async internalComplete(tx: Prisma.TransactionClient, id: string, userId: string) {
    const transaction = await tx.bodegaTransaction.findUnique({
      where: { id },
      include: { 
        items: true,
        warehouse: { select: { id: true, code: true } },
        targetWarehouse: { select: { id: true, code: true } }
      }
    });

    if (!transaction) throw new BodegaTransactionError("Transacción no encontrada.");

    const estadosPermitidos = ["APROBADA", "EN_TRANSITO", "PENDIENTE", "COMPLETADO", "COMPLETADA"];
    if (!estadosPermitidos.includes(transaction.status)) {
      throw new BodegaTransactionError(`No se puede completar desde ${transaction.status}`);
    }

    for (const item of transaction.items) {
      const qty = Number(item.quantity);
      const isPositiveRecord = ["INGRESO", "INGRESO_TRANSFERENCIA", "DEVOLUCION", "ENTRADA"].includes(transaction.type) || (transaction.type === "AJUSTE" && qty > 0);
      
      if (isPositiveRecord) {
        // INCREMENTAR STOCK GENERAL
        const wCode = (transaction.warehouse as any)?.code || "";
        await this.updateStockInternal(tx, transaction.warehouseId, item.articleId, qty, "INCREMENT", wCode);
        
        // REGLA ORO: Para que el stock sea "Trazable" (FIFO), DEBE tener initialBalance y currentBalance
        await tx.bodegaTransactionItem.update({
          where: { id: item.id },
          data: {
            initialBalance: qty,
            currentBalance: qty,
          }
        });

        // Crear lote para trazabilidad extendida
        await tx.bodegaLot.create({
          data: {
            code: `${transaction.folio}-${item.id.slice(0, 4)}`,
            warehouseId: transaction.warehouseId,
            articleId: item.articleId,
            sourceMovementItemId: item.id,
            initialQuantity: qty,
            currentQuantity: qty,
            unitCost: item.unitCost,
            status: "ACTIVO",
            createdBy: userId
          }
        });
      } 
      else if (transaction.type === "RETIRO" || transaction.type === "SALIDA" || (transaction.type === "AJUSTE" && qty < 0)) {
        const wCode = (transaction.warehouse as any)?.code || "";
        await this.updateStockInternal(tx, transaction.warehouseId, item.articleId, Math.abs(qty), "DECREMENT", wCode);
        
        // Decrementar reserva si es un retiro que venía de una solicitud aprobada
        if (transaction.type === "RETIRO" || transaction.type === "SALIDA") {
          // Solo si existe el registro de stock y tiene reserva (para evitar error de decremento bajo cero si no hubiera)
          const stock = await tx.bodegaStock.findUnique({
            where: { warehouseId_articleId: { warehouseId: transaction.warehouseId, articleId: item.articleId } }
          });
          
          if (stock && Number(stock.reservedQuantity) >= Math.abs(qty)) {
            await tx.bodegaStock.update({
              where: { warehouseId_articleId: { warehouseId: transaction.warehouseId, articleId: item.articleId } },
              data: { reservedQuantity: { decrement: Math.abs(qty) } }
            });
          }

          // REGLA ORO: Si tiene un sourceTransactionItemId, debemos DECREMENTAR su currentBalance
          if (item.sourceTransactionItemId) {
            await tx.bodegaTransactionItem.update({
              where: { id: item.sourceTransactionItemId },
              data: { currentBalance: { decrement: Math.abs(qty) } }
            });
          }
        }
      }
      else if (transaction.type === "TRANSFERENCIA" && transaction.targetWarehouseId) {
        // Una transferencia asume reducción en origen e incremento en destino
        const sourceCode = (transaction.warehouse as any)?.code || "";
        const targetCode = (transaction.targetWarehouse as any)?.code || "";

        await this.updateStockInternal(tx, transaction.warehouseId, item.articleId, qty, "DECREMENT", sourceCode);
        await this.updateStockInternal(tx, transaction.targetWarehouseId, item.articleId, qty, "INCREMENT", targetCode);

        // IMPORTANTE: Si es transferencia, el ítem en la transacción de ORIGEN no tiene balance positivo
        // Pero el ítem en la transacción (o el movimiento generado en destino) SÍ debe tenerlo.
        // En nuestro actual modelo de la clase, las transferencias se manejan mejor como dos transacciones separadas (SALIDA e INGRESO_TRANSFERENCIA)
        // Si usamos el tipo TRANSFERENCIA dual, debemos asegurar que el bucket se cree en el destino si aplica.
        // Por consistencia con la UI, las transferencias suelen llamar a SALIDA y luego INGRESO_TRANSFERENCIA.
      }
    }

    const updated = await tx.bodegaTransaction.update({
      where: { id },
      data: { status: "COMPLETADO", appliedBy: userId, appliedAt: new Date() },
      include: { items: true }
    });

    await tx.bodegaTransactionLog.create({
      data: {
        transactionId: id,
        action: "COMPLETE",
        description: "Transacción completada exitosamente.",
        createdBy: userId,
      }
    });

    return updated;
  }

  private async updateStockInternal(tx: Prisma.TransactionClient, warehouseId: string, articleId: string, quantity: number, operation: "INCREMENT" | "DECREMENT", warehouseCode?: string) {
    const isTransit = warehouseCode === "TRANSITO";
    const delta = operation === "INCREMENT" ? quantity : -quantity;

    await tx.bodegaStock.upsert({
      where: { warehouseId_articleId: { warehouseId, articleId } },
      create: { 
        warehouseId, articleId, 
        quantity: delta,
        stockVerificado: isTransit ? 0 : delta,
        stockNoVerificado: isTransit ? delta : 0
      },
      update: {
        quantity: { increment: delta },
        ...(isTransit 
          ? { stockNoVerificado: { increment: delta } }
          : { stockVerificado: { increment: delta } }
        )
      }
    });
  }

  async update(id: string, data: UpdateBodegaTransactionInput, userId: string) {
    const transaction = await this.getById(id);
    if (transaction.status !== "BORRADOR" && transaction.status !== "PENDIENTE") {
      throw new BodegaTransactionError(`No se puede editar una transacción en estado ${transaction.status}`);
    }

    return await this.prisma.$transaction(async (tx) => {
      await tx.bodegaTransactionItem.deleteMany({ where: { transactionId: id } });

      const updated = await tx.bodegaTransaction.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          warehouseId: data.warehouseId,
          targetWarehouseId: data.targetWarehouseId,
          priority: data.priority,
          requiredDate: data.requiredDate,
          requestedBy: data.requestedById,
          responsable: data.responsableName,
          externalReference: data.externalReference,
          quotationNumber: data.quotationNumber,
          deliveryGuide: data.deliveryGuide,
          observations: data.observations,
          metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
          items: {
            create: data.items?.map(item => ({
              articleId: item.articleId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              observations: item.observations,
            }))
          }
        },
        include: { items: true }
      });

      await tx.bodegaTransactionLog.create({
        data: {
          transactionId: id,
          action: "UPDATE",
          description: "Transacción actualizada.",
          createdBy: userId,
        }
      });

      return updated;
    });
  }

  async delete(id: string, _userId: string) {
    const transaction = await this.getById(id);
    if (!["BORRADOR", "RECHAZADA", "ANULADA"].includes(transaction.status)) {
      throw new BodegaTransactionError(`No se puede eliminar una transacción en estado ${transaction.status}`);
    }

    return await this.prisma.bodegaTransaction.delete({
      where: { id }
    });
  }

  async reject(id: string, userId: string, observations: string) {
    const transaction = await this.getById(id);
    if (transaction.status !== "PENDIENTE") {
      throw new BodegaTransactionError(`No se puede rechazar desde el estado ${transaction.status}`);
    }

    return await this.prisma.bodegaTransaction.update({
      where: { id },
      data: { 
        status: "RECHAZADA",
        observations: `${transaction.observations || ""}\nRechazado: ${observations}`.trim()
      }
    });
  }

  /**
   * Actualiza observaciones de una transacción (usado para cambios rápidos de metadatos)
   */
  async updateObservations(
    id: string, 
    observations: string, 
    externalReference?: string | null,
    quotationNumber?: string | null,
    deliveryGuide?: string | null,
    userId?: string
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.bodegaTransaction.update({
        where: { id },
        data: { 
          observations,
          ...(externalReference !== undefined ? { externalReference } : {}),
          ...(quotationNumber !== undefined ? { quotationNumber } : {}),
          ...(deliveryGuide !== undefined ? { deliveryGuide } : {}),
        }
      });

      if (userId) {
        await tx.bodegaTransactionLog.create({
          data: {
            transactionId: id,
            action: "UPDATE",
            description: "Metadatos de la transacción actualizados.",
            createdBy: userId,
          }
        });
      }

      return updated;
    });
  }

  /**
   * Obtiene estadísticas de transacciones (KPIs para dashboard)
   */
  async getStats(filters: { requestedBy?: string }) {
    const where: Prisma.BodegaTransactionWhereInput = {
      ...(filters.requestedBy ? { requestedBy: filters.requestedBy } : {}),
      type: "RETIRO", // Usualmente stats son para solicitudes
    };

    const stats = await this.prisma.bodegaTransaction.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });

    const result = {
      total: 0,
      pendientes: 0,
      aprobados: 0,
      rechazados: 0,
      completados: 0,
    };

    stats.forEach((s) => {
      const count = s._count._all;
      result.total += count;
      if (s.status === "PENDIENTE") result.pendientes += count;
      else if (s.status === "APROBADA") result.aprobados += count;
      else if (s.status === "RECHAZADA") result.rechazados += count;
      else if (s.status === "COMPLETADA") result.completados += count;
    });

    return result;
  }
}

export const bodegaTransactionService = new BodegaTransactionService();
