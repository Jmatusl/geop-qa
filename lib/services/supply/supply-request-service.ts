/**
 * Servicio: Solicitud de Insumos
 * Archivo: lib/services/supply/supply-request-service.ts
 * 
 * Lógica de negocio para gestión de solicitudes de insumos
 */

import { prisma } from '@/lib/prisma';
import type {
  CreateSupplyRequestInput,
  UpdateSupplyRequestInput,
  ReviewSupplyRequestInput,
  CancelSupplyRequestInput,
} from '@/lib/validations/supply-request';
import { Prisma } from '@prisma/client';

/**
 * Errores de negocio personalizados
 */
export class SupplyRequestBusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupplyRequestBusinessError';
  }
}

export class SupplyRequestService {
  private readonly prisma = prisma;

  /**
   * Obtiene el prefijo de folio configurado para solicitudes de insumos.
   * Compatibilidad:
   * - app_setting.key = "insumos_config" -> { folio: { prefix: "SI" } }
   * - app_setting.key = "supply_module_config" -> { workflow: { autoNumbering: { prefix: "SI" } } }
   */
  private async getRequestFolioPrefix(): Promise<string> {
    try {
      const insumosSetting = await this.prisma.appSetting.findUnique({
        where: { key: 'insumos_config' },
        select: { value: true },
      });

      const insumosConfig = insumosSetting?.value as Record<string, unknown> | null | undefined;
      const insumosFolio = insumosConfig?.folio as Record<string, unknown> | undefined;
      const insumosPrefix = insumosFolio?.prefix;
      if (typeof insumosPrefix === 'string' && insumosPrefix.trim().length > 0) {
        return insumosPrefix.trim().toUpperCase();
      }

      const supplySetting = await this.prisma.appSetting.findUnique({
        where: { key: 'supply_module_config' },
        select: { value: true },
      });

      const supplyConfig = supplySetting?.value as Record<string, unknown> | null | undefined;
      const workflow = supplyConfig?.workflow as Record<string, unknown> | undefined;
      const autoNumbering = workflow?.autoNumbering as Record<string, unknown> | undefined;
      const supplyPrefix = autoNumbering?.prefix;
      if (typeof supplyPrefix === 'string' && supplyPrefix.trim().length > 0) {
        return supplyPrefix.trim().toUpperCase();
      }
    } catch {
      // Si falla la lectura de configuración, se usa fallback local.
    }

    return 'SI';
  }

  /**
   * Genera el siguiente folio disponible
   */
  private async generateFolio(): Promise<string> {
    const prefix = await this.getRequestFolioPrefix();

    // Obtener el último folio
    const lastRequest = await this.prisma.supplyRequest.findFirst({
      where: {
        folio: {
          startsWith: `${prefix}-`,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { folio: true },
    });

    if (!lastRequest) {
      return `${prefix}-0001`;
    }

    // Extraer número del folio (SI-0001 -> 1)
    const match = lastRequest.folio.match(/-(\d+)$/);
    const lastNumber = match ? parseInt(match[1], 10) : 0;
    const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;

    // Formatear con padding (SI-0002, SI-0010, SI-0123)
    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Calcula el valor estimado total de los items
   */
  private calculateEstimatedTotal(items: CreateSupplyRequestInput['items']): number {
    return items.reduce((total, item) => {
      const itemValue = (item.estimatedPrice || 0) * item.quantity;
      return total + itemValue;
    }, 0);
  }

  /**
   * Crea una nueva solicitud de insumos
   */
  async create(data: CreateSupplyRequestInput, userId: string): Promise<{ id: string; folio: string }> {
    // 1. Validar que la instalación existe
    const installation = await this.prisma.mntInstallation.findUnique({
      where: { id: data.installationId },
    });

    if (!installation) {
      throw new SupplyRequestBusinessError('La instalación seleccionada no existe');
    }

    // 2. Validar que todas las categorías existen
    const categoryIds = [...new Set(data.items.map((item) => item.categoryId))];
    const categories = await this.prisma.mntSupplyCategory.findMany({
      where: { id: { in: categoryIds } },
    });

    if (categories.length !== categoryIds.length) {
      throw new SupplyRequestBusinessError('Una o más categorías no existen');
    }

    // 3. Generar folio
    const folio = await this.generateFolio();

    // 5. Calcular valor estimado total
    const estimatedValue = this.calculateEstimatedTotal(data.items);

    // 6. Transacción: Crear solicitud + items + timeline
    const result = await this.prisma.$transaction(async (tx) => {
      // Crear solicitud
      const request = await tx.supplyRequest.create({
        data: {
          folio,
          title: data.title,
          description: data.description,
          statusCode: 'PENDIENTE',
          installationId: data.installationId,
          requestedDate: data.requestedDate,
          priority: data.priority,
          justification: data.justification,
          estimatedValue,
          observations: data.observations,
          createdBy: userId,
        },
      });

      // Crear items
      await tx.supplyRequestItem.createMany({
        data: data.items.map((item, index) => ({
          requestId: request.id,
          categoryId: item.categoryId,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit ?? 'UNI',
          statusCode: 'PENDIENTE',
          // Construir specifications con prefijo de urgencia
          specifications: item.urgencyLevel && item.urgencyLevel !== 'NORMAL'
            ? `[${item.urgencyLevel}]${item.specifications ? ` ${item.specifications}` : ''}`
            : (item.specifications ?? null),
          estimatedPrice: item.estimatedPrice,
          observations: item.observations,
          displayOrder: index,
        })),
      });

      // Crear entrada en timeline
      await tx.supplyRequestTimeline.create({
        data: {
          requestId: request.id,
          action: 'CREADA',
          description: 'Solicitud creada',
          createdBy: userId,
          metadata: {
            previousStatus: null,
            newStatus: 'PENDIENTE',
          },
        },
      });

      // Registrar en audit log
      await tx.accessLog.create({
        data: {
          userId,
          eventType: 'CREATE',
          module: 'supply_request',
          ipAddress: '0.0.0.0', // Se actualizará desde la API
          userAgent: 'Internal',
          metadata: {
            requestId: request.id,
            folio: request.folio,
            itemsCount: data.items.length,
            estimatedValue: estimatedValue.toString(),
          },
        },
      });

      return { id: request.id, folio: request.folio };
    });

    return result;
  }

  /**
   * Actualiza una solicitud existente (solo si está PENDIENTE)
   */
  async update(data: UpdateSupplyRequestInput, userId: string): Promise<void> {
    // 1. Verificar que la solicitud existe y está en estado PENDIENTE
    const request = await this.prisma.supplyRequest.findUnique({
      where: { id: data.id },
      include: { items: true },
    });

    if (!request) {
      throw new SupplyRequestBusinessError('La solicitud no existe');
    }

    if (request.statusCode !== 'PENDIENTE') {
      throw new SupplyRequestBusinessError(
        'Solo se pueden editar solicitudes en estado PENDIENTE'
      );
    }

    // 2. Validar permisos (solo el creador o admin puede editar)
    if (request.createdBy !== userId) {
      // TODO: Verificar si el usuario es admin
      throw new SupplyRequestBusinessError('No tiene permisos para editar esta solicitud');
    }

    // 3. Calcular nuevo valor estimado si se actualizan items
    let estimatedValue = request.estimatedValue;
    if (data.items) {
      estimatedValue = new Prisma.Decimal(this.calculateEstimatedTotal(data.items));
    }

    // 4. Transacción: Actualizar solicitud + items
    await this.prisma.$transaction(async (tx) => {
      // Actualizar solicitud
      await tx.supplyRequest.update({
        where: { id: data.id },
        data: {
          title: data.title,
          description: data.description,
          installationId: data.installationId,
          requestedDate: data.requestedDate,
          priority: data.priority,
          justification: data.justification,
          estimatedValue,
          observations: data.observations,
        },
      });

      // Si se actualizan items, eliminar los antiguos y crear los nuevos
      if (data.items) {
        await tx.supplyRequestItem.deleteMany({
          where: { requestId: data.id },
        });

        await tx.supplyRequestItem.createMany({
          data: data.items.map((item, index) => ({
            requestId: data.id!,
            categoryId: item.categoryId,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit ?? 'UNI',
            statusCode: 'PENDIENTE',
            specifications: item.specifications,
            estimatedPrice: item.estimatedPrice,
            observations: item.observations,
            displayOrder: index,
          })),
        });
      }

      // Timeline
      await tx.supplyRequestTimeline.create({
        data: {
          requestId: data.id!,
          action: 'ACTUALIZADA',
          description: 'Solicitud actualizada',
          createdBy: userId,
        },
      });

      // Audit log
      await tx.accessLog.create({
        data: {
          userId,
          eventType: 'UPDATE',
          module: 'supply_request',
          ipAddress: '0.0.0.0',
          userAgent: 'Internal',
          metadata: {
            requestId: data.id,
            changes: data,
          },
        },
      });
    });
  }

  /**
   * Aprueba o rechaza una solicitud
   */
  async review(data: ReviewSupplyRequestInput, userId: string): Promise<void> {
    // 1. Verificar que la solicitud existe y está en estado PENDIENTE
    const request = await this.prisma.supplyRequest.findUnique({
      where: { id: data.id },
    });

    if (!request) {
      throw new SupplyRequestBusinessError('La solicitud no existe');
    }

    if (request.statusCode !== 'PENDIENTE') {
      throw new SupplyRequestBusinessError(
        'Solo se pueden revisar solicitudes en estado PENDIENTE'
      );
    }

    const newStatus = data.action === 'APROBAR' ? 'APROBADA' : 'RECHAZADA';
    const actionLabel = data.action === 'APROBAR' ? 'aprobada' : 'rechazada';

    // 2. Transacción: Actualizar estado + actualizar items si es aprobada
    await this.prisma.$transaction(async (tx) => {
      // Actualizar solicitud
      await tx.supplyRequest.update({
        where: { id: data.id },
        data: {
          statusCode: newStatus,
          observations: data.observations,
        },
      });

      // Si se aprueba, cambiar items a EN_PROCESO
      if (data.action === 'APROBAR') {
        await tx.supplyRequestItem.updateMany({
          where: { requestId: data.id },
          data: { statusCode: 'PENDIENTE' }, // Los items quedan pendientes de cotización
        });
      } else {
        // Si se rechaza, marcar items como rechazados
        await tx.supplyRequestItem.updateMany({
          where: { requestId: data.id },
          data: { statusCode: 'RECHAZADO' },
        });
      }

      // Timeline
      await tx.supplyRequestTimeline.create({
        data: {
          requestId: data.id,
          action: data.action === 'APROBAR' ? 'APROBADA' : 'RECHAZADA',
          description: `Solicitud ${actionLabel}`,
          createdBy: userId,
          metadata: {
            previousStatus: 'PENDIENTE',
            newStatus,
            observations: data.observations,
          },
        },
      });

      // Audit log
      await tx.accessLog.create({
        data: {
          userId,
          eventType: data.action === 'APROBAR' ? 'APPROVE' : 'REJECT',
          module: 'supply_request',
          ipAddress: '0.0.0.0',
          userAgent: 'Internal',
          metadata: {
            requestId: data.id,
            action: data.action,
            observations: data.observations,
          },
        },
      });
    });
  }

  /**
   * Anula una solicitud
   */
  async cancel(data: CancelSupplyRequestInput, userId: string): Promise<void> {
    // 1. Verificar que la solicitud existe
    const request = await this.prisma.supplyRequest.findUnique({
      where: { id: data.id },
    });

    if (!request) {
      throw new SupplyRequestBusinessError('La solicitud no existe');
    }

    // 2. Verificar que se puede anular (solo PENDIENTE o APROBADA)
    if (!['PENDIENTE', 'APROBADA', 'EN_PROCESO'].includes(request.statusCode)) {
      throw new SupplyRequestBusinessError(
        'Solo se pueden anular solicitudes en estado PENDIENTE, APROBADA o EN_PROCESO'
      );
    }

    // 3. Transacción: Anular solicitud + items
    await this.prisma.$transaction(async (tx) => {
      const previousStatus = request.statusCode;

      // Actualizar solicitud
      await tx.supplyRequest.update({
        where: { id: data.id },
        data: {
          statusCode: 'ANULADA',
          observations: data.reason,
        },
      });

      // Anular items
      await tx.supplyRequestItem.updateMany({
        where: { requestId: data.id },
        data: { statusCode: 'RECHAZADO' },
      });

      // Timeline
      await tx.supplyRequestTimeline.create({
        data: {
          requestId: data.id,
          action: 'ANULADA',
          description: 'Solicitud anulada',
          createdBy: userId,
          metadata: {
            previousStatus,
            newStatus: 'ANULADA',
            reason: data.reason,
          },
        },
      });

      // Audit log
      await tx.accessLog.create({
        data: {
          userId,
          eventType: 'CANCEL',
          module: 'supply_request',
          ipAddress: '0.0.0.0',
          userAgent: 'Internal',
          metadata: {
            requestId: data.id,
            reason: data.reason,
          },
        },
      });
    });
  }

  /**
   * Obtiene el detalle completo de una solicitud por ID
   */
  async getById(id: string) {
    const request = await this.prisma.supplyRequest.findUnique({
      where: { id },
      include: {
        status: true,
        installation: { select: { id: true, name: true } },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: {
          include: {
            category: { select: { id: true, name: true } },
            status: true,
          },
          orderBy: { displayOrder: 'asc' },
        },
        // Incluir cotizaciones con proveedor y conteo de ítems
        quotations: {
          include: {
            supplier: {
              select: {
                id: true,
                rut: true,
                businessLine: true,
                legalName: true,
                fantasyName: true,
                contactEmail: true,
                phone: true,
              },
            },
            status: { select: { code: true, name: true, color: true } },
            items: {
              include: {
                requestItem: {
                  select: {
                    id: true,
                    itemName: true,
                    quantity: true,
                    unit: true,
                    category: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            attachments: {
              select: { id: true, fileName: true, fileSize: true, mimeType: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        timeline: {
          include: {
            creator: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

        if (!request) return null;

        return {
          id: request.id,
          folio: request.folio,
          title: request.title,
          description: request.description,
          statusCode: request.statusCode,
          status: request.status,
          priority: request.priority,
          installationId: request.installationId,
          installation: request.installation,
          requestedDate: request.requestedDate,
          justification: request.justification,
          estimatedValue: request.estimatedValue.toNumber(),
          observations: request.observations,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
          creator: request.creator,
          items: request.items.map((item) => ({
            id: item.id,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            specifications: item.specifications,
            estimatedPrice: item.estimatedPrice,
            observations: item.observations,
            statusCode: item.statusCode,
            status: item.status,
            category: item.category,
            displayOrder: item.displayOrder,
          })),
          quotations: request.quotations.map((q) => ({
            id: q.id,
            folio: q.folio,
            statusCode: q.statusCode,
            status: q.status,
            quotationDate: q.quotationDate,
            expirationDate: q.expirationDate,
            totalAmount: q.totalAmount,
            observations: q.observations,
            sentAt: q.sentAt,
            receivedAt: q.receivedAt,
            approvedAt: q.approvedAt,
            rejectedAt: q.rejectedAt,
            rejectionReason: q.rejectionReason,
            createdAt: q.createdAt,
            supplier: q.supplier,
            items: q.items.map((qi) => ({
              id: qi.id,
              requestItemId: qi.requestItemId,
              quotedQuantity: qi.quotedQuantity,
              unitPrice: qi.unitPrice,
              subtotal: qi.subtotal,
              requestItem: qi.requestItem,
            })),
            attachments: q.attachments,
            itemsCount: q.items.length,
          })),
          timeline: request.timeline.map((t) => ({
            id: t.id,
            action: t.action,
            description: t.description,
            metadata: t.metadata,
            createdAt: t.createdAt,
            creator: t.creator,
          })),
        };
      }

      /**
       * Obtiene detalle de una cotización por id.
       */
      async getQuotationById(quotationId: string) {
        return this.prisma.supplyQuotation.findUnique({
          where: { id: quotationId },
          include: {
            request: {
              select: {
                id: true,
                folio: true,
                installation: { select: { id: true, name: true } },
                creator: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
            supplier: {
              select: {
                id: true,
                rut: true,
                businessLine: true,
                legalName: true,
                fantasyName: true,
                contactEmail: true,
                phone: true,
              },
            },
            status: { select: { code: true, name: true, color: true } },
            items: {
              include: {
                requestItem: {
                  select: {
                    id: true,
                    itemName: true,
                    quantity: true,
                    unit: true,
                    category: { select: { id: true, name: true } },
                  },
                },
              },
              orderBy: { displayOrder: 'asc' },
            },
            attachments: {
              select: { id: true, fileName: true, fileSize: true, mimeType: true },
            },
          },
        });
      }

      /**
       * Registra cotización manual (montos + precios por ítem) y la marca como RECIBIDA.
       */
      async registerManualQuotation(
        quotationId: string,
        payload: {
          quotationDate?: Date | null;
          expirationDate?: Date | null;
          quotationNumber?: string | null;
          purchaseOrderNumber?: string | null;
          observations?: string | null;
          totalAmount?: number | null;
          items: Array<{
            quotationItemId: string;
            unitPrice?: number;
            quotedQuantity?: number;
            supplierNotes?: string | null;
          }>;
        },
        userId: string
      ) {
        const quotation = await this.prisma.supplyQuotation.findUnique({
          where: { id: quotationId },
          select: { id: true, requestId: true, folio: true },
        });

        if (!quotation) {
          throw new SupplyRequestBusinessError('Cotización no encontrada');
        }

        if (!payload.items.length) {
          throw new SupplyRequestBusinessError('Debe registrar al menos un ítem cotizado');
        }

        await this.prisma.$transaction(async (tx) => {
          for (const item of payload.items) {
            const quotedQuantity = item.quotedQuantity && item.quotedQuantity > 0 ? item.quotedQuantity : 1;
            const unitPrice = item.unitPrice && item.unitPrice > 0 ? item.unitPrice : null;
            const subtotal = unitPrice ? quotedQuantity * unitPrice : null;

            await tx.supplyQuotationItem.update({
              where: { id: item.quotationItemId },
              data: {
                unitPrice,
                quotedQuantity,
                subtotal,
                supplierNotes: item.supplierNotes ?? null,
              },
            });
          }

          await tx.supplyQuotation.update({
            where: { id: quotationId },
            data: {
              statusCode: 'RECIBIDA',
              quotationDate: payload.quotationDate ?? undefined,
              expirationDate: payload.expirationDate ?? undefined,
              quotationNumber: payload.quotationNumber?.trim() || null,
              purchaseOrderNumber: payload.purchaseOrderNumber?.trim() || null,
              observations: payload.observations ?? null,
              totalAmount: payload.totalAmount ?? null,
              receivedAt: new Date(),
              receivedBy: userId,
            },
          });

          await tx.supplyRequestTimeline.create({
            data: {
              requestId: quotation.requestId,
              action: 'COTIZACION_RECIBIDA',
              description: `Se registró cotización manual para ${quotation.folio}`,
              createdBy: userId,
              metadata: { quotationId: quotation.id, totalAmount: payload.totalAmount },
            },
          });
        });
      }

      /**
       * Registra envío de correo de cotización (trazabilidad).
       */
      async registerQuotationEmailSent(
        quotationId: string,
        payload: {
          recipientEmail: string;
          responseDeadline?: Date | null;
          observations?: string | null;
        },
        userId: string
      ) {
        const quotation = await this.prisma.supplyQuotation.findUnique({
          where: { id: quotationId },
          select: { id: true, requestId: true, folio: true },
        });

        if (!quotation) {
          throw new SupplyRequestBusinessError('Cotización no encontrada');
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.supplyQuotation.update({
            where: { id: quotationId },
            data: {
              statusCode: 'ENVIADA',
              sentAt: new Date(),
              sentBy: userId,
              expirationDate: payload.responseDeadline ?? undefined,
              observations: payload.observations ?? undefined,
            },
          });

          await tx.supplyQuotationEmailSent.create({
            data: {
              quotationId,
              recipientEmail: payload.recipientEmail,
              subject: `Solicitud de Cotización ${quotation.folio}`,
              bodyHtml: payload.observations?.trim() || 'Solicitud enviada desde sistema',
              sentBy: userId,
              status: 'sent',
            },
          });

          await tx.supplyRequestTimeline.create({
            data: {
              requestId: quotation.requestId,
              action: 'COTIZACION_ENVIADA',
              description: `Cotización ${quotation.folio} enviada a ${payload.recipientEmail}`,
              createdBy: userId,
              metadata: { quotationId: quotation.id, recipientEmail: payload.recipientEmail },
            },
          });
        });
      }

  /**
   * Obtiene listado paginado de solicitudes con filtros
   */
  async list(filters: {
    page?: number;
    pageSize?: number;
    status?: string;
    installationId?: string;
    priority?: string;
    createdBy?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    requester?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      page = 1,
      pageSize = 20,
      status,
      installationId,
      priority,
      createdBy,
      startDate,
      endDate,
      requester,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const skip = (page - 1) * pageSize;

    // Construir where clause
    const where: Prisma.SupplyRequestWhereInput = {};

    if (status) {
      where.statusCode = status;
    }

    if (installationId) {
      where.installationId = installationId;
    }

    if (priority) {
      where.priority = priority;
    }

    if (createdBy) {
      where.createdBy = createdBy;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    if (search) {
      where.OR = [
        { folio: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { creator: { firstName: { contains: search, mode: 'insensitive' } } },
        { creator: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (requester?.trim()) {
      const requesterText = requester.trim();
      const requesterFilter: Prisma.SupplyRequestWhereInput = {
        OR: [
          { creator: { firstName: { contains: requesterText, mode: 'insensitive' } } },
          { creator: { lastName: { contains: requesterText, mode: 'insensitive' } } },
        ],
      };

      if (where.AND) {
        (where.AND as Prisma.SupplyRequestWhereInput[]).push(requesterFilter);
      } else {
        where.AND = [requesterFilter];
      }
    }

    // Queries paralelas
    const [requests, total] = await Promise.all([
      this.prisma.supplyRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true },
          },
          installation: {
            select: { id: true, name: true },
          },
          // Incluir statusCode de items para resumen de estados
          items: {
            select: { statusCode: true },
          },
          quotations: {
            select: {
              id: true,
              folio: true,
              statusCode: true,
              totalAmount: true,
              purchaseOrderNumber: true,
              supplier: {
                select: {
                  businessLine: true,
                  legalName: true,
                  fantasyName: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { items: true, quotations: true },
          },
        },
      }),
      this.prisma.supplyRequest.count({ where }),
    ]);

    return {
      data: requests.map((req) => ({
        id: req.id,
        folio: req.folio,
        title: req.title,
        description: req.description,
        status: req.statusCode,
        priority: req.priority,
        requestedDate: req.requestedDate,
        createdAt: req.createdAt,
        estimatedValue: req.estimatedValue.toNumber(),
        creator: {
          id: req.creator.id,
          name: `${req.creator.firstName} ${req.creator.lastName}`,
        },
        installation: req.installation,
        itemsCount: req._count.items,
        // Conteo de cotizaciones vinculadas
        quotationsCount: req._count.quotations,
        quotationsSummary: req.quotations.map((quotation) => ({
          id: quotation.id,
          folio: quotation.folio,
          statusCode: quotation.statusCode,
          totalAmount: quotation.totalAmount,
          supplierName:
            quotation.supplier.businessLine ||
            quotation.supplier.legalName ||
            quotation.supplier.fantasyName ||
            'Sin proveedor',
          purchaseOrderNumber: quotation.purchaseOrderNumber,
        })),
        // Resumen de estados de items: { PENDIENTE: 3, COTIZADO: 2, ... }
        itemStatusSummary: req.items.reduce(
          (acc, item) => {
            acc[item.statusCode] = (acc[item.statusCode] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ─── Métodos de Cotización ─────────────────────────────────

  /**
   * Genera el siguiente folio de cotización disponible (COT-XXXX)
   */
  private async generateQuotationFolio(): Promise<string> {
    const last = await this.prisma.supplyQuotation.findFirst({
      orderBy: { folio: 'desc' },
      select: { folio: true },
    });
    if (!last) return 'COT-0001';
    const lastNumber = parseInt(last.folio.split('-')[1]);
    const next = lastNumber + 1;
    return `COT-${next.toString().padStart(4, '0')}`;
  }

  /**
   * Crea una cotización para una solicitud, con uno o más proveedores.
   * Crea una SupplyQuotation por cada proveedor seleccionado.
   */
  async createQuotation(data: {
    requestId: string;
    supplierIds: string[];
    itemIds: string[];
    expirationDate: Date;
    observationsForSupplier?: string | null;
    internalObservations?: string | null;
  }, userId: string) {
    // Validar que la solicitud existe y está en estado aceptable
    const request = await this.prisma.supplyRequest.findUnique({
      where: { id: data.requestId },
      include: {
        items: { select: { id: true, quantity: true, statusCode: true } },
      },
    });
    if (!request) throw new SupplyRequestBusinessError('Solicitud no encontrada');
    if (['RECHAZADA', 'ANULADA', 'FINALIZADA'].includes(request.statusCode)) {
      throw new SupplyRequestBusinessError('No se puede crear cotización en el estado actual de la solicitud');
    }
    if (data.supplierIds.length === 0) {
      throw new SupplyRequestBusinessError('Debe seleccionar al menos un proveedor');
    }
    if (data.itemIds.length === 0) {
      throw new SupplyRequestBusinessError('Debe seleccionar al menos un ítem');
    }

    // Obtener ítems seleccionados
    const selectedItems = request.items.filter((i) => data.itemIds.includes(i.id));

    // Generar el folio base ANTES de la transacción para evitar colisiones
    const baseFolio = await this.generateQuotationFolio();
    const baseFolioNumber = parseInt(baseFolio.split('-')[1]);

    // Crear una cotización por cada proveedor dentro de una transacción
    return await this.prisma.$transaction(async (tx) => {
      const createdQuotations = [];

      for (let i = 0; i < data.supplierIds.length; i++) {
        const supplierId = data.supplierIds[i];
        // Generar folio secuencial: COT-0001, COT-0002, COT-0003, etc.
        const folio = `COT-${(baseFolioNumber + i).toString().padStart(4, '0')}`;

        const quotation = await tx.supplyQuotation.create({
          data: {
            folio,
            requestId: data.requestId,
            supplierId,
            statusCode: 'PENDIENTE',
            expirationDate: data.expirationDate,
            observations: data.internalObservations ?? null,
            createdBy: userId,
            items: {
              create: selectedItems.map((item, idx) => ({
                requestItemId: item.id,
                quotedQuantity: item.quantity,
                unitPrice: 0,
                subtotal: 0,
                displayOrder: idx,
              })),
            },
          },
        });
        createdQuotations.push(quotation);

        // Actualizar estado de ítems seleccionados a COTIZADO si estaban PENDIENTE
        await tx.supplyRequestItem.updateMany({
          where: {
            id: { in: data.itemIds },
            statusCode: 'PENDIENTE',
          },
          data: { statusCode: 'COTIZADO' },
        });
      }

      // Actualizar estado de la solicitud a EN_PROCESO si estaba PENDIENTE
      if (request.statusCode === 'PENDIENTE') {
        await tx.supplyRequest.update({
          where: { id: data.requestId },
          data: { statusCode: 'EN_PROCESO' },
        });
      }

      // Registrar en timeline
      await tx.supplyRequestTimeline.create({
        data: {
          requestId: data.requestId,
          action: 'COTIZACION_CREADA',
          description: `Se ${createdQuotations.length === 1 ? 'creó la cotización' : `crearon ${createdQuotations.length} cotizaciones`} ${createdQuotations.map((q) => q.folio).join(', ')}`,
          createdBy: userId,
          metadata: { quotationIds: createdQuotations.map((q) => q.id) },
        },
      });

      return createdQuotations;
    });
  }

  /**
   * Aprueba una cotización completa y cancela automáticamente las que tienen conflictos
   */
  async approveQuotation(
    quotationId: string,
    userId: string,
    purchaseOrderNumber?: string
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verificar que la cotización existe y está en estado válido
      const quotation = await tx.supplyQuotation.findUnique({
        where: { id: quotationId },
        include: {
          items: { select: { requestItemId: true } },
          request: { select: { id: true, folio: true } }
        }
      });

      if (!quotation) {
        throw new SupplyRequestBusinessError('Cotización no encontrada');
      }

      if (quotation.statusCode === 'APROBADA') {
        throw new SupplyRequestBusinessError('La cotización ya está aprobada');
      }

      if (!['RECIBIDA', 'PENDIENTE'].includes(quotation.statusCode)) {
        throw new SupplyRequestBusinessError(
          `No se puede aprobar una cotización en estado ${quotation.statusCode}`
        );
      }

      // 2. Obtener IDs de productos involucrados
      const productIds = quotation.items.map(item => item.requestItemId);

      // 3. Validar que ningún producto ya esté aprobado en otra cotización
      const approvedConflicts = await tx.supplyQuotation.findMany({
        where: {
          requestId: quotation.requestId,
          statusCode: 'APROBADA',
          items: {
            some: {
              requestItemId: { in: productIds }
            }
          }
        },
        include: {
          items: {
            where: { requestItemId: { in: productIds } },
            include: { requestItem: { select: { itemName: true } } }
          }
        }
      });

      if (approvedConflicts.length > 0) {
        const conflictDetails = approvedConflicts.flatMap(cot =>
          cot.items.map(item => ({
            product: item.requestItem.itemName,
            quotation: cot.folio
          }))
        );

        throw new SupplyRequestBusinessError(
          `No se puede aprobar: los siguientes productos ya están aprobados:\n${
            conflictDetails.map(c => `- ${c.product} (en ${c.quotation})`).join('\n')
          }`
        );
      }

      // 4. Buscar cotizaciones en conflicto (que contengan alguno de esos productos)
      const conflictingQuotations = await tx.supplyQuotation.findMany({
        where: {
          requestId: quotation.requestId,
          id: { not: quotationId },
          statusCode: { notIn: ['APROBADA', 'RECHAZADA', 'CANCELADA', 'NO_COTIZADO'] },
          items: {
            some: {
              requestItemId: { in: productIds }
            }
          }
        },
        select: { id: true, folio: true }
      });

      // 5. Cancelar cotizaciones en conflicto
      for (const conflict of conflictingQuotations) {
        await tx.supplyQuotation.update({
          where: { id: conflict.id },
          data: {
            statusCode: 'CANCELADA',
            updatedAt: new Date()
          }
        });

        // Registrar timeline de cancelación
        await tx.supplyRequestTimeline.create({
          data: {
            requestId: quotation.requestId,
            action: 'COTIZACION_CANCELADA_AUTO',
            description: `Cotización ${conflict.folio} cancelada automáticamente por aprobación de ${quotation.folio}`,
            metadata: {
              cancelledQuotationId: conflict.id,
              approvedQuotationId: quotationId,
              reason: 'EXCLUSION_PRODUCTOS'
            },
            createdBy: userId
          }
        });
      }

      // 6. Aprobar la cotización
      await tx.supplyQuotation.update({
        where: { id: quotationId },
        data: {
          statusCode: 'APROBADA',
          approvedAt: new Date(),
          approvedBy: userId,
          purchaseOrderNumber: purchaseOrderNumber || null,
          updatedAt: new Date()
        }
      });

      // 7. Actualizar estados de los ítems a APROBADO
      await tx.supplyRequestItem.updateMany({
        where: {
          id: { in: productIds }
        },
        data: {
          statusCode: 'APROBADO',
          updatedAt: new Date()
        }
      });

      // 8. Registrar timeline de aprobación
      await tx.supplyRequestTimeline.create({
        data: {
          requestId: quotation.requestId,
          action: 'COTIZACION_APROBADA',
          description: `Cotización ${quotation.folio} aprobada${
            purchaseOrderNumber ? ` (OC: ${purchaseOrderNumber})` : ''
          }`,
          metadata: {
            quotationId,
            approvedItemIds: productIds,
            cancelledQuotations: conflictingQuotations.map(c => c.folio)
          },
          createdBy: userId
        }
      });

      // 9. Verificar si se completó el 100% de items
      const requestWithItems = await tx.supplyRequest.findUnique({
        where: { id: quotation.requestId },
        include: {
          items: { select: { id: true, statusCode: true } }
        }
      });

      if (requestWithItems) {
        const totalItems = requestWithItems.items.length;
        const itemsAprobados = requestWithItems.items.filter(i => i.statusCode === 'APROBADO').length;

        // Si 100% aprobado, rechazar TODAS las cotizaciones restantes
        if (itemsAprobados === totalItems) {
          const remainingQuotations = await tx.supplyQuotation.findMany({
            where: {
              requestId: quotation.requestId,
              statusCode: { in: ['PENDIENTE', 'ENVIADA', 'RECIBIDA'] }
            },
            select: { id: true, folio: true }
          });

          for (const remaining of remainingQuotations) {
            await tx.supplyQuotation.update({
              where: { id: remaining.id },
              data: {
                statusCode: 'RECHAZADA',
                rejectionReason: 'Todos los productos ya tienen cotización aprobada',
                rejectedAt: new Date(),
                updatedAt: new Date()
              }
            });

            await tx.supplyRequestTimeline.create({
              data: {
                requestId: quotation.requestId,
                action: 'COTIZACION_RECHAZADA_AUTO',
                description: `Cotización ${remaining.folio} rechazada automáticamente por completar 100% de productos aprobados`,
                metadata: {
                  quotationId: remaining.id,
                  reason: 'SOLICITUD_COMPLETA_100'
                },
                createdBy: userId
              }
            });
          }
        }
      }

      // 10. Recalcular estado global de la solicitud
      await this.recalculateRequestStatus(tx, quotation.requestId);
    });
  }

  /**
   * Rechaza una cotización
   */
  async rejectQuotation(
    quotationId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const quotation = await tx.supplyQuotation.findUnique({
        where: { id: quotationId },
        include: {
          items: { select: { requestItemId: true } },
          request: { select: { id: true, folio: true } }
        }
      });

      if (!quotation) {
        throw new SupplyRequestBusinessError('Cotización no encontrada');
      }

      if (quotation.statusCode === 'APROBADA') {
        throw new SupplyRequestBusinessError('No se puede rechazar una cotización aprobada');
      }

      // 1. Actualizar cotización
      await tx.supplyQuotation.update({
        where: { id: quotationId },
        data: {
          statusCode: 'RECHAZADA',
          rejectedAt: new Date(),
          rejectedBy: userId,
          rejectionReason: reason,
          updatedAt: new Date()
        }
      });

      // 2. Verificar si algún ítem debe cambiar a RECHAZADO
      const productIds = quotation.items.map(i => i.requestItemId);

      for (const productId of productIds) {
        // Contar cotizaciones activas para este producto
        const activeQuotations = await tx.supplyQuotation.count({
          where: {
            requestId: quotation.requestId,
            statusCode: { in: ['PENDIENTE', 'ENVIADA', 'RECIBIDA'] },
            items: {
              some: { requestItemId: productId }
            }
          }
        });

        // Si no hay más cotizaciones activas, marcar ítem como RECHAZADO
        if (activeQuotations === 0) {
          await tx.supplyRequestItem.update({
            where: { id: productId },
            data: { statusCode: 'RECHAZADO', updatedAt: new Date() }
          });
        }
      }

      // 3. Registrar en timeline
      await tx.supplyRequestTimeline.create({
        data: {
          requestId: quotation.requestId,
          action: 'COTIZACION_RECHAZADA',
          description: `Cotización ${quotation.folio} rechazada: ${reason}`,
          metadata: {
            quotationId,
            reason,
            affectedItemIds: productIds
          },
          createdBy: userId
        }
      });

      // 4. Recalcular estado global
      await this.recalculateRequestStatus(tx, quotation.requestId);
    });
  }

  /**
   * Recalcula el estado global de la solicitud basado en estados de ítems
   */
  private async recalculateRequestStatus(
    tx: Prisma.TransactionClient,
    requestId: string
  ): Promise<void> {
    const request = await tx.supplyRequest.findUnique({
      where: { id: requestId },
      include: {
        items: { select: { statusCode: true } },
        quotations: { select: { statusCode: true } }
      }
    });

    if (!request) return;

    const totalItems = request.items.length;
    const itemsAprobados = request.items.filter(i => i.statusCode === 'APROBADO').length;
    const itemsEntregados = request.items.filter(i => i.statusCode === 'ENTREGADO').length;
    const itemsRechazados = request.items.filter(i => i.statusCode === 'RECHAZADO').length;
    const itemsNoDisponibles = request.items.filter(i => i.statusCode === 'NO_DISPONIBLE').length;

    const hasActiveQuotations = request.quotations.some(q =>
      ['ENVIADA', 'RECIBIDA'].includes(q.statusCode)
    );

    let newStatus: string;

    if (itemsEntregados === totalItems) {
      newStatus = 'FINALIZADA';
    } else if (itemsAprobados === totalItems) {
      newStatus = 'APROBADA';
    } else if (itemsAprobados > 0 && itemsAprobados < totalItems) {
      newStatus = 'PARCIAL';
    } else if ((itemsRechazados + itemsNoDisponibles) === totalItems) {
      newStatus = 'RECHAZADA';
    } else if (hasActiveQuotations) {
      newStatus = 'EN_PROCESO';
    } else {
      newStatus = 'PENDIENTE';
    }

    if (request.statusCode !== newStatus) {
      await tx.supplyRequest.update({
        where: { id: requestId },
        data: { statusCode: newStatus, updatedAt: new Date() }
      });

      await tx.supplyRequestTimeline.create({
        data: {
          requestId,
          action: 'ESTADO_CAMBIADO',
          description: `Estado de solicitud cambió de ${request.statusCode} a ${newStatus}`,
          metadata: {
            previousStatus: request.statusCode,
            newStatus,
            itemStats: { totalItems, itemsAprobados, itemsEntregados, itemsRechazados }
          }
        }
      });
    }
  }

  /**
   * Marca una cotización como NO_COTIZADO (proveedor no respondió o no cotiza esos productos)
   */
  async markAsNoCotizado(
    quotationId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const quotation = await tx.supplyQuotation.findUnique({
        where: { id: quotationId },
        include: {
          items: { select: { requestItemId: true } },
          request: { select: { id: true, folio: true } }
        }
      });

      if (!quotation) {
        throw new SupplyRequestBusinessError('Cotización no encontrada');
      }

      // 1. Actualizar cotización
      await tx.supplyQuotation.update({
        where: { id: quotationId },
        data: {
          statusCode: 'NO_COTIZADO',
          rejectionReason: reason,
          updatedAt: new Date()
        }
      });

      // 2. Verificar si algún ítem debe cambiar a NO_DISPONIBLE
      const productIds = quotation.items.map(i => i.requestItemId);

      for (const productId of productIds) {
        // Contar cotizaciones activas para este producto
        const activeQuotations = await tx.supplyQuotation.count({
          where: {
            requestId: quotation.requestId,
            statusCode: { in: ['PENDIENTE', 'ENVIADA', 'RECIBIDA'] },
            items: {
              some: { requestItemId: productId }
            }
          }
        });

        // Si no hay más cotizaciones activas, marcar ítem como NO_DISPONIBLE
        if (activeQuotations === 0) {
          await tx.supplyRequestItem.update({
            where: { id: productId },
            data: { statusCode: 'NO_DISPONIBLE', updatedAt: new Date() }
          });
        }
      }

      // 3. Registrar en timeline
      await tx.supplyRequestTimeline.create({
        data: {
          requestId: quotation.requestId,
          action: 'COTIZACION_NO_COTIZADO',
          description: `Cotización ${quotation.folio} marcada como No Cotizado: ${reason}`,
          metadata: {
            quotationId,
            reason,
            affectedItemIds: productIds
          },
          createdBy: userId
        }
      });

      // 4. Recalcular estado global
      await this.recalculateRequestStatus(tx, quotation.requestId);
    });
  }

  /**
   * Actualiza el estado de una cotización (método legacy, usar approveQuotation o rejectQuotation)
   */
  async updateQuotationStatus(quotationId: string, newStatusCode: string, userId: string) {
    const quotation = await this.prisma.supplyQuotation.findUnique({
      where: { id: quotationId },
      select: { id: true, folio: true, requestId: true, statusCode: true },
    });
    if (!quotation) throw new SupplyRequestBusinessError('Cotización no encontrada');

    await this.prisma.$transaction(async (tx) => {
      await tx.supplyQuotation.update({
        where: { id: quotationId },
        data: {
          statusCode: newStatusCode,
          ...(newStatusCode === 'APROBADA' ? { approvedAt: new Date(), approvedBy: userId } : {}),
          ...(newStatusCode === 'RECHAZADA' ? { rejectedAt: new Date(), rejectedBy: userId } : {}),
        },
      });

      await tx.supplyRequestTimeline.create({
        data: {
          requestId: quotation.requestId,
          action: `COTIZACION_${newStatusCode}`,
          description: `Cotización ${quotation.folio} cambió a estado ${newStatusCode}`,
          createdBy: userId,
          metadata: { quotationId },
        },
      });
    });
  }

  /**
   * Obtiene proveedores activos para el selector de cotizaciones
   */
  async getActiveSuppliers() {
    return this.prisma.mntSupplier.findMany({
      where: { isActive: true },
      select: {
        id: true,
        rut: true,
        businessLine: true,
        legalName: true,
        fantasyName: true,
        contactEmail: true,
        phone: true,
      },
      orderBy: { businessLine: 'asc' },
    });
  }
}

export const supplyRequestService = new SupplyRequestService();

