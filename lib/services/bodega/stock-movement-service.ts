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

export interface BodegaMovementItemListFilters {
  page: number;
  pageSize: number;
  search?: string;
  warehouseId?: string;
  showExhausted?: boolean;
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

  /**
   * Genera número único de movimiento siguiendo el patrón legacy:
   * TIPO-AAAAMM-0001
   */
  private async generateMovementFolio(type: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `${type.toUpperCase()}-${year}${month}`;

    const lastMovement = await this.prisma.bodegaStockMovement.findFirst({
      where: {
        folio: {
          startsWith: `${prefix}-`,
        },
      },
      orderBy: { folio: "desc" },
      select: { folio: true },
    });

    let sequence = 1;
    if (lastMovement) {
      const parts = lastMovement.folio.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `${prefix}-${String(sequence).padStart(4, "0")}`;
  }

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
              { request: { folio: { contains: search, mode: "insensitive" } } },
              { reason: { contains: search, mode: "insensitive" } },
              { externalReference: { contains: search, mode: "insensitive" } },
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
          items: {
            select: {
              quantity: true,
              unitCost: true,
              initialBalance: true,
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

    const mappedData = data.map((m) => {
      let totalItems = 0;
      let totalPrice = 0;

      if (m.items && m.items.length > 0) {
        totalItems = m.items.reduce((acc, it) => {
          // Si quantity es 0, intentamos con initialBalance (común en importaciones legacy o cuadraturas)
          const qty = Number(it.quantity || 0) || Number(it.initialBalance || 0);
          return acc + qty;
        }, 0);

        totalPrice = m.items.reduce((acc, it) => {
          const qty = Number(it.quantity || 0) || Number(it.initialBalance || 0);
          const cost = Number(it.unitCost || 0);
          return acc + qty * cost;
        }, 0);
      }

      return {
        ...m,
        totalItems,
        totalPrice,
      };
    });

    return {
      data: mappedData,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async listMovementItems(filters: BodegaMovementItemListFilters) {
    const { page, pageSize, search, warehouseId, showExhausted } = filters;

    const where: Prisma.BodegaStockMovementItemWhereInput = {
      ...(warehouseId ? { movement: { warehouseId } } : {}),
      ...(!showExhausted
        ? {
            OR: [{ currentBalance: { gt: 0 } }, { initialBalance: 0 }],
          }
        : {}),
      ...(search
        ? {
            OR: [
              { article: { code: { contains: search, mode: "insensitive" } } },
              { article: { name: { contains: search, mode: "insensitive" } } },
              { movement: { folio: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.bodegaStockMovementItem.findMany({
        where,
        include: {
          article: {
            select: { id: true, code: true, name: true },
          },
          movement: {
            select: {
              id: true,
              folio: true,
              movementType: true,
              reason: true,
              observations: true,
              warehouse: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bodegaStockMovementItem.count({ where }),
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
    const movement = await this.prisma.bodegaStockMovement.findUnique({
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
            externalReference: true,
            logs: {
              include: {
                creator: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            },
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
            evidences: true,
          },
          orderBy: [{ createdAt: "asc" }],
        },
        evidences: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!movement) return null;

    const totalItems = movement.items.reduce((acc, it) => acc + (Number(it.quantity || 0) || Number(it.initialBalance || 0)), 0);
    const totalPrice = movement.items.reduce((acc, it) => acc + (Number(it.quantity || 0) || Number(it.initialBalance || 0)) * Number(it.unitCost || 0), 0);

    return {
      ...movement,
      totalItems,
      totalPrice,
    };
  }

  async createMovement(input: CreateBodegaMovementInput, userId: string) {
    const { movementType, warehouseId, reason, observations, responsable, externalReference } = input;

    // Normalizar items: soportar tanto el formato nuevo (array) como el legacy (campos individuales)
    const itemsToProcess = input.items || (input.articleId && input.quantity ? [{ articleId: input.articleId, quantity: input.quantity, unitCost: input.unitCost }] : []);

    if (itemsToProcess.length === 0) {
      throw new BodegaMovementError("Debe incluir al menos un artículo");
    }

    const warehouse = await this.prisma.bodegaWarehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true, isActive: true },
    });

    if (!warehouse || !warehouse.isActive) {
      throw new BodegaMovementError("La bodega seleccionada no existe o está inactiva");
    }

    return this.prisma.$transaction(async (tx) => {
      const folio = await this.generateMovementFolio(movementType);
      const statusInicial = input.autoVerify ? "APROBADO" : "PENDIENTE";

      // 1. Crear el Movimiento Base (UN SOLO FOLIO)
      const movement = await tx.bodegaStockMovement.create({
        data: {
          folio,
          warehouseId,
          movementType,
          status: statusInicial,
          reason: reason || null,
          observations: observations || null,
          responsable: responsable || null,
          externalReference: externalReference || null,
          createdBy: userId,
          ...(input.evidence && input.evidence.length > 0
            ? {
                evidences: {
                  create: input.evidence.map((url) => ({
                    url,
                    fileName: url.split("/").pop() || "archivo",
                  })),
                },
              }
            : {}),
        },
      });

      // 2. Procesar cada ítem
      for (const itemInput of itemsToProcess) {
        const { articleId, quantity } = itemInput;
        const movementQty = Number(quantity);

        const article = await tx.bodegaArticle.findUnique({
          where: { id: articleId },
          select: { id: true, isActive: true },
        });

        if (!article || !article.isActive) {
          throw new BodegaMovementError(`El artículo ${articleId} no existe o está inactivo`);
        }

        const isPositiveMovement = movementType === "INGRESO" || movementType.includes("INGRESO") || movementType.includes("AJUSTE") || (movementType as string) === "DEVOLUCION";
        const isNegativeMovement = movementType === "SALIDA" || movementType.includes("EGRESO") || (movementType as string) === "MERMA";

        const newItemsToCreate: Array<{ quantity: number; unitCost: Prisma.Decimal | null; parentMovementItemId: string | null }> = [];

        if (itemInput.sourceMovementItemId) {
          const sourceItem = await tx.bodegaStockMovementItem.findUnique({
            where: { id: itemInput.sourceMovementItemId },
          });

          if (sourceItem) {
            if (isNegativeMovement) {
              await tx.bodegaStockMovementItem.update({
                where: { id: sourceItem.id },
                data: { currentBalance: { decrement: movementQty } },
              });
            }
            newItemsToCreate.push({
              quantity: movementQty,
              unitCost: sourceItem.unitCost,
              parentMovementItemId: sourceItem.id,
            });
          }
        } else if (isNegativeMovement) {
          // APLICAR REGLA FIFO AUTOMÁTICA
          const availableStocks = await tx.bodegaStockMovementItem.findMany({
            where: {
              articleId,
              movement: {
                warehouseId,
                status: { in: ["EJECUTADO", "COMPLETADO"] },
                movementType: { in: ["INGRESO", "INGRESO_TRANSFERENCIA", "AJUSTE", "DEVOLUCION"] },
              },
              currentBalance: { gt: 0 },
            },
            orderBy: { createdAt: "asc" },
          });

          let remainingQty = movementQty;
          for (const stock of availableStocks) {
            if (remainingQty <= 0) break;
            const toTake = Math.min(Number(stock.currentBalance), remainingQty);

            await tx.bodegaStockMovementItem.update({
              where: { id: stock.id },
              data: { currentBalance: { decrement: toTake } },
            });

            // ACTUALIZAR LOTE ASOCIADO (Sincronización bucket con reporte global)
            const lot = await tx.bodegaLot.findFirst({
              where: { sourceMovementItemId: stock.id },
            });
            if (lot) {
              const newLotQty = Math.max(0, Number(lot.currentQuantity) - toTake);
              await tx.bodegaLot.update({
                where: { id: lot.id },
                data: {
                  currentQuantity: newLotQty,
                  status: newLotQty <= 0 ? "AGOTADO" : lot.status,
                },
              });
            }

            newItemsToCreate.push({
              quantity: toTake,
              unitCost: stock.unitCost,
              parentMovementItemId: stock.id,
            });

            remainingQty -= toTake;
          }

          if (remainingQty > 0) {
            newItemsToCreate.push({
              quantity: remainingQty,
              unitCost: null,
              parentMovementItemId: null,
            });
          }
        } else {
          newItemsToCreate.push({
            quantity: movementQty,
            unitCost: (itemInput as any).unitCost ? new Prisma.Decimal((itemInput as any).unitCost) : null,
            parentMovementItemId: null,
          });
        }

        // Crear los items persistidos y mantener solo el primero como ref backward (para itemsVerification autoVerify)
        let movementItem: any = null;
        for (const newIt of newItemsToCreate) {
          const mItem = await tx.bodegaStockMovementItem.create({
            data: {
              movementId: movement.id,
              articleId,
              quantity: newIt.quantity,
              unitCost: newIt.unitCost,
              parentMovementItemId: newIt.parentMovementItemId,
              initialBalance: isPositiveMovement ? newIt.quantity : 0,
              currentBalance: isPositiveMovement ? newIt.quantity : 0,
            },
          });
          if (!movementItem) movementItem = mItem;
        }

        // 3. Lógica de Stock Automático (si aplica autoVerify)
        if (input.autoVerify) {
          const configSetting = await tx.appSetting.findUnique({
            where: { key: "BODEGA_GENERAL_CONFIG" },
          });
          const config = (configSetting?.value as any) || {};
          const autoVerificarStock = config.auto_verificar_ingresos === true;

          const stock = await tx.bodegaStock.upsert({
            where: { warehouseId_articleId: { warehouseId, articleId } },
            create: {
              warehouseId,
              articleId,
              quantity: 0,
              stockVerificado: 0,
              stockNoVerificado: 0,
              reservedQuantity: 0,
            },
            update: {},
          });

          const currentQuantity = Number(stock.quantity);
          const currentVerificado = Number(stock.stockVerificado);
          const currentNoVerificado = Number(stock.stockNoVerificado);
          const currentReserved = Number(stock.reservedQuantity);

          let nextQuantity = currentQuantity;
          let nextVerificado = currentVerificado;
          let nextNoVerificado = currentNoVerificado;
          let nextReserved = currentReserved;

          let shouldVerify = input.autoVerify === true || autoVerificarStock === true;

          const destinoNombre = warehouse.name?.toLowerCase() || "";
          const esHaciaTransito = destinoNombre.includes("tránsit") || destinoNombre.includes("transit");
          if (esHaciaTransito) shouldVerify = false;

          if (movementType === "INGRESO" || (movementType === "AJUSTE" && movementQty > 0)) {
            nextQuantity = currentQuantity + movementQty;
            if (shouldVerify) nextVerificado = currentVerificado + movementQty;
            else nextNoVerificado = currentNoVerificado + movementQty;

            // REGLA ORO: Crear LOTE para reportes
            await tx.bodegaLot.create({
              data: {
                code: `${movement.folio}-${movementItem.id.slice(0, 4)}`,
                warehouseId: warehouseId,
                articleId: articleId,
                sourceMovementItemId: movementItem.id,
                initialQuantity: movementQty,
                currentQuantity: movementQty,
                unitCost: (itemInput as any).unitCost || null,
                status: "ACTIVO",
                createdBy: userId,
                observations: `Lote autogenerado por ${movementType} ${movement.folio}`,
              },
            });
          } else if (movementType === "SALIDA" || (movementType === "AJUSTE" && movementQty < 0)) {
            const absQty = Math.abs(movementQty);
            nextQuantity = currentQuantity - absQty;
            let restante = absQty;
            let diffNoVerificado = Math.min(currentNoVerificado, restante);
            restante -= diffNoVerificado;
            let diffVerificado = Math.min(currentVerificado, restante);
            restante -= diffVerificado;
            if (restante > 0) diffNoVerificado += restante;

            nextNoVerificado = currentNoVerificado - diffNoVerificado;
            nextVerificado = currentVerificado - diffVerificado;

            // El consumo de lotes (FIFO) ya ocurrió arriba al crear los items de movimiento
            // en createMovement (líneas 311-327), pero allí faltó actualizar BodegaLot.
            // Lo corregiremos en el fragmento de arriba.
          }

          await tx.bodegaStock.update({
            where: { warehouseId_articleId: { warehouseId, articleId } },
            data: {
              quantity: nextQuantity,
              stockVerificado: nextVerificado,
              stockNoVerificado: nextNoVerificado,
              reservedQuantity: nextReserved,
            },
          });

          if (shouldVerify && movementType === "INGRESO") {
            await tx.bodegaStockMovementItem.update({
              where: { id: movementItem.id },
              data: {
                cantidadVerificada: movementQty,
                verificadoPorId: userId,
                fechaVerificacion: new Date(),
              },
            });
          }
        }
      }

      // Finalizar estado en EJECUTADO si fue autoverificado
      if (input.autoVerify) {
        await tx.bodegaStockMovement.update({
          where: { id: movement.id },
          data: {
            status: "EJECUTADO",
            appliedAt: new Date(),
            appliedBy: userId,
          },
        });
      }

      // IMPORTANTE: Retornar el objeto completo con sus items para el frontend/logs
      return await this.getMovementById(movement.id);
    });
  }

  async applyMovement(movementId: string, userId: string, observations?: string, itemsAList?: Array<{ id: string; quantity: number; observations?: string; evidence?: string[] }>) {
    const movement = await this.prisma.bodegaStockMovement.findUnique({
      where: { id: movementId },
      include: {
        warehouse: true,
        request: {
          include: {
            warehouse: true,
          },
        },
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

    if (movement.status === "EJECUTADO" || movement.status === "COMPLETADO") {
      throw new BodegaMovementError("El movimiento ya fue ejecutado o completado");
    }

    // Regla de negocio: Los ajustes y otros pueden tener flujos distintos
    const esAjuste = movement.movementType.includes("AJUSTE");
    const estadosPermitidos = esAjuste ? ["BORRADOR", "APROBADO", "PENDIENTE"] : ["APROBADO", "PENDIENTE"];

    if (!estadosPermitidos.includes(movement.status)) {
      throw new BodegaMovementError(`No se puede ejecutar un movimiento en estado ${movement.status}`);
    }

    if (movement.items.length === 0) {
      throw new BodegaMovementError("El movimiento no tiene ítems para aplicar");
    }

    // Obtener configuración global
    const configSetting = await this.prisma.appSetting.findUnique({
      where: { key: "BODEGA_GENERAL_CONFIG" },
    });
    const config = (configSetting?.value as any) || {};
    const autoVerificar = config.auto_verificar_ingresos === true;

    return this.prisma.$transaction(async (tx) => {
      for (const item of movement.items) {
        const itemReview = itemsAList?.find((i) => i.id === item.id);
        const movementQty = itemReview ? Number(itemReview.quantity) : Number(item.quantity);

        const stock = await tx.bodegaStock.upsert({
          where: {
            warehouseId_articleId: {
              warehouseId: movement.warehouseId,
              articleId: item.articleId,
            },
          },
          create: {
            warehouseId: movement.warehouseId,
            articleId: item.articleId,
            quantity: 0,
            stockVerificado: 0,
            stockNoVerificado: 0,
            reservedQuantity: 0,
          },
          update: {},
        });

        const currentQuantity = Number(stock?.quantity ?? 0);
        const currentVerificado = Number(stock?.stockVerificado ?? 0);
        const currentNoVerificado = Number(stock?.stockNoVerificado ?? 0);
        const currentReserved = Number(stock?.reservedQuantity ?? 0);

        let nextQuantity = currentQuantity;
        let nextVerificado = currentVerificado;
        let nextNoVerificado = currentNoVerificado;
        let nextReserved = currentReserved;

        let shouldVerify = itemReview ? true : autoVerificar;

        if (movement.movementType === "INGRESO" || (movement.movementType === "AJUSTE" && movementQty > 0)) {
          // Lógica de reglas de verificación automática
          const origenNombre = movement.request?.warehouse?.name?.toLowerCase() || "";
          const esDesdeTransito = origenNombre.includes("tránsit") || origenNombre.includes("transit");

          // Si viene de En Tránsito -> stock VERIFICADO en destino
          if (esDesdeTransito) {
            shouldVerify = true;
          }

          const destinoNombre = movement.warehouse?.name?.toLowerCase() || "";
          const esHaciaTransito = destinoNombre.includes("tránsit") || destinoNombre.includes("transit");

          // Si la bodega destino es "En Tránsito" -> SIEMPRE stock NO verificado
          if (esHaciaTransito) {
            shouldVerify = false;
          }

          nextQuantity = currentQuantity + movementQty;
          if (shouldVerify) {
            nextVerificado = currentVerificado + movementQty;
          } else {
            nextNoVerificado = currentNoVerificado + movementQty;
          }

          // REGLA ORO: En ingresos, inicializar el balance del item y crear el LOTE para reportes
          const updatedItem = await tx.bodegaStockMovementItem.update({
            where: { id: item.id },
            data: {
              initialBalance: movementQty,
              currentBalance: movementQty,
              cantidadVerificada: shouldVerify ? movementQty : null,
              verificadoPorId: shouldVerify ? userId : null,
              fechaVerificacion: shouldVerify ? new Date() : null,
              observations: itemReview?.observations || null,
            },
          });

          // Crear Lote para que aparezca en el inventario global
          await tx.bodegaLot.create({
            data: {
              code: `${movement.folio}-${item.id.slice(0, 4)}`,
              warehouseId: movement.warehouseId,
              articleId: item.articleId,
              sourceMovementItemId: item.id,
              initialQuantity: movementQty,
              currentQuantity: movementQty,
              unitCost: (item as any).unitCost || null,
              status: "ACTIVO",
              createdBy: userId,
              observations: `Lote generado por ${movement.movementType} ${movement.folio}`,
            },
          });
        } else if (movement.movementType === "SALIDA" || (movement.movementType === "AJUSTE" && movementQty < 0)) {
          const absQty = Math.abs(movementQty);
          nextQuantity = currentQuantity - absQty;

          // Lógica de buckets: Intentar sacar de no verificado primero, luego de verificado
          let restante = absQty;
          let diffNoVerificado = Math.min(currentNoVerificado, restante);
          restante -= diffNoVerificado;
          let diffVerificado = Math.min(currentVerificado, restante);
          restante -= diffVerificado;

          if (restante > 0) {
            diffNoVerificado += restante;
          }

          nextNoVerificado = currentNoVerificado - diffNoVerificado;
          nextVerificado = currentVerificado - diffVerificado;

          // REGLA ORO: En salidas, aplicar FIFO sobre los items con balance positivo y sus LOTES
          const availableBuckets = await tx.bodegaStockMovementItem.findMany({
            where: {
              articleId: item.articleId,
              currentBalance: { gt: 0 },
              movement: {
                warehouseId: movement.warehouseId,
                status: { in: ["EJECUTADO", "COMPLETADO"] },
              },
            },
            orderBy: { createdAt: "asc" },
          });

          let qtyToConsume = absQty;
          for (const bucket of availableBuckets) {
            if (qtyToConsume <= 0) break;
            const toTake = Math.min(Number(bucket.currentBalance), qtyToConsume);

            // Descontar del balance del item (bucket)
            await tx.bodegaStockMovementItem.update({
              where: { id: bucket.id },
              data: { currentBalance: { decrement: toTake } },
            });

            // Descontar del LOTE asociado
            const lot = await tx.bodegaLot.findFirst({
              where: { sourceMovementItemId: bucket.id },
            });
            if (lot) {
              const newLotQty = Math.max(0, Number(lot.currentQuantity) - toTake);
              await tx.bodegaLot.update({
                where: { id: lot.id },
                data: {
                  currentQuantity: newLotQty,
                  status: newLotQty <= 0 ? "AGOTADO" : lot.status,
                },
              });
            }

            qtyToConsume -= toTake;
          }

          // Actualizar el item actual para reflejar que consumió stock
          await tx.bodegaStockMovementItem.update({
            where: { id: item.id },
            data: {
              initialBalance: 0,
              currentBalance: 0,
              observations: itemReview?.observations || null,
            },
          });
        } else if (movement.movementType === "RESERVA") {
          nextReserved = currentReserved + movementQty;
        } else if (movement.movementType === "LIBERACION") {
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
            stockVerificado: nextVerificado,
            stockNoVerificado: nextNoVerificado,
            reservedQuantity: nextReserved,
          },
          update: {
            quantity: nextQuantity,
            stockVerificado: nextVerificado,
            stockNoVerificado: nextNoVerificado,
            reservedQuantity: nextReserved,
          },
        });
      }

      const updated = await tx.bodegaStockMovement.update({
        where: { id: movementId },
        data: {
          status: "EJECUTADO",
          appliedAt: new Date(),
          appliedBy: userId,
          observations: observations ? `${movement.observations || ""}\n${observations}`.trim() : movement.observations,
        },
      });

      return updated;
    });
  }

  async completeMovement(movementId: string, userId: string, itemsVerificados: Array<{ id: string; quantity: number; observations?: string; evidence?: string[] }>, destinationWarehouseId?: string) {
    const movement = await this.prisma.bodegaStockMovement.findUnique({
      where: { id: movementId },
      include: {
        items: true,
      },
    });

    if (!movement) {
      throw new BodegaMovementError("Movimiento no encontrado");
    }

    if (movement.status !== "EJECUTADO") {
      throw new BodegaMovementError("Solo se pueden verificar movimientos en estado EJECUTADO");
    }

    return this.prisma.$transaction(async (tx) => {
      const finalWarehouseId = destinationWarehouseId || movement.warehouseId;
      const isTransfering = destinationWarehouseId && destinationWarehouseId !== movement.warehouseId;

      for (const itemV of itemsVerificados) {
        const itemOriginal = movement.items.find((i) => i.id === itemV.id);
        if (!itemOriginal) continue;

        const cantAVerificar = Number(itemV.quantity);

        // 1. Manejar el stock en la bodega de origen (la que tiene actualmente asignado el movimiento)
        const originStock = await tx.bodegaStock.findUnique({
          where: {
            warehouseId_articleId: {
              warehouseId: movement.warehouseId,
              articleId: itemOriginal.articleId,
            },
          },
        });

        if (originStock) {
          await tx.bodegaStock.update({
            where: { id: originStock.id },
            data: {
              stockNoVerificado: { decrement: cantAVerificar },
              // Si se está transfiriendo (recepcionando desde Tránsito), el stock físicamente sale de esta bodega virtual
              ...(isTransfering ? { quantity: { decrement: cantAVerificar } } : {}),
            },
          });
        }

        // 2. Si se cambia de bodega (Transferencia / Cierre de TRÁNSITO)
        if (isTransfering) {
          await tx.bodegaStock.upsert({
            where: {
              warehouseId_articleId: {
                warehouseId: finalWarehouseId,
                articleId: itemOriginal.articleId,
              },
            },
            create: {
              warehouseId: finalWarehouseId,
              articleId: itemOriginal.articleId,
              quantity: cantAVerificar,
              stockVerificado: cantAVerificar,
              stockNoVerificado: 0,
              reservedQuantity: 0,
            },
            update: {
              quantity: { increment: cantAVerificar },
              stockVerificado: { increment: cantAVerificar },
            },
          });
        } else if (originStock) {
          // Si NO hay transferencia (fue una verificación estándar in-situ), sumamos al verificado ahí mismo
          await tx.bodegaStock.update({
            where: { id: originStock.id },
            data: {
              stockVerificado: { increment: cantAVerificar },
            },
          });
        }

        // Registrar en el item
        await tx.bodegaStockMovementItem.update({
          where: { id: itemV.id },
          data: {
            cantidadVerificada: cantAVerificar,
            verificadoPorId: userId,
            fechaVerificacion: new Date(),
            observations: itemV.observations || null,
          },
        });
      }

      // Cambiar estado a COMPLETADO y actualizar la bodega si fue una recepción de transferencia
      return tx.bodegaStockMovement.update({
        where: { id: movementId },
        data: {
          status: "COMPLETADO",
          ...(isTransfering ? { warehouseId: finalWarehouseId } : {}),
        },
      });
    });
  }

  async approveMovement(id: string, userId: string) {
    const movement = await this.prisma.bodegaStockMovement.findUnique({
      where: { id },
    });

    if (!movement) throw new BodegaMovementError("Movimiento no encontrado");
    if (movement.status !== "PENDIENTE") {
      throw new BodegaMovementError(`No se puede aprobar un movimiento en estado ${movement.status}`);
    }

    return this.prisma.bodegaStockMovement.update({
      where: { id },
      data: {
        status: "APROBADO",
        approvedAt: new Date(),
        approvedBy: userId,
      },
    });
  }

  async rejectMovement(id: string, userId: string, reason: string) {
    const movement = await this.prisma.bodegaStockMovement.findUnique({
      where: { id },
    });

    if (!movement) throw new BodegaMovementError("Movimiento no encontrado");
    if (movement.status !== "PENDIENTE") {
      throw new BodegaMovementError(`No se puede rechazar un movimiento en estado ${movement.status}`);
    }

    return this.prisma.bodegaStockMovement.update({
      where: { id },
      data: {
        status: "RECHAZADO",
        observations: reason ? `${movement.observations || ""}\nMotivo rechazo: ${reason}`.trim() : movement.observations,
      },
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
        const stockVerificado = Number(row.stockVerificado);
        const stockNoVerificado = Number(row.stockNoVerificado);
        const reservedQuantity = Number(row.reservedQuantity);
        const availableQuantity = quantity - reservedQuantity;
        const minimumStock = Number(row.article.minimumStock);
        return {
          id: row.id,
          quantity,
          stockVerificado,
          stockNoVerificado,
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

  async quickSearchInventory(search: string, warehouseId?: string, articleId?: string) {
    const rows = await this.prisma.bodegaStock.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        ...(articleId ? { articleId } : {}),
        ...(!articleId && search
          ? {
              OR: [
                { article: { code: { contains: search, mode: "insensitive" } } },
                { article: { name: { contains: search, mode: "insensitive" } } },
                { article: { description: { contains: search, mode: "insensitive" } } },
                { article: { partNumber: { contains: search, mode: "insensitive" } } },
                { article: { internalCode: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        article: {
          select: { id: true, code: true, name: true, description: true, unit: true, minimumStock: true, partNumber: true, internalCode: true },
        },
        warehouse: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: [{ article: { name: "asc" } }],
      take: 200,
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
        partNumber: string | null;
        internalCode: string | null;
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
        // Solo crear entrada si esta bodega tiene stock disponible positivo
        if (available <= 0) continue;
        grouped.set(key, {
          id: row.article.id,
          codigo: row.article.code,
          nombre: row.article.name,
          descripcion: row.article.description,
          unidad: row.article.unit,
          stockTotal: available,
          partNumber: row.article.partNumber,
          internalCode: row.article.internalCode,
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
        // Solo agregar bodega si tiene stock disponible positivo
        if (available > 0) {
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
    }

    // Solo retornar artículos que tengan al menos una bodega con stock positivo
    const resultados = Array.from(grouped.values()).filter((a) => a.bodegas.length > 0);

    return {
      total: resultados.length,
      resultados,
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
          sourceMovementItem: {
            include: {
              movement: {
                select: {
                  id: true,
                  folio: true,
                  reason: true,
                  observations: true,
                  movementType: true,
                },
              },
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
        movementType: row.sourceMovementItem?.movement.movementType || (row.sourceMovementItemId ? "GENERADO" : "MANUAL"),
        status: row.status,
        quantity: row.currentQuantity,
        initialQuantity: row.initialQuantity,
        unitCost: row.unitCost,
        expirationDate: row.expirationDate,
        createdAt: row.createdAt,
        article: row.article,
        warehouse: row.warehouse,
        serialCount: row._count.serialNumbers,
        sourceMovement: row.sourceMovementItem?.movement || null,
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
        status: { in: ["EJECUTADO", "COMPLETADO"] },
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

  async addItemEvidence(itemId: string, url: string) {
    const item = await this.prisma.bodegaStockMovementItem.findUnique({
      where: { id: itemId },
      select: { movementId: true },
    });

    if (!item) {
      throw new BodegaMovementError("El ítem de movimiento no existe");
    }

    return this.prisma.bodegaMovementEvidence.create({
      data: {
        movementId: item.movementId,
        movementItemId: itemId,
        url,
        fileName: url.split("/").pop() || "archivo",
      },
    });
  }

  async removeItemEvidence(evidenceId: string) {
    return this.prisma.bodegaMovementEvidence.delete({
      where: { id: evidenceId },
    });
  }
}

export const bodegaStockMovementService = new BodegaStockMovementService();
