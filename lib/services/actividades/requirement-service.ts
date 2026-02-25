/**
 * Service Layer - Requerimientos de Actividades
 * 
 * Centraliza la lógica de negocio y operaciones de base de datos
 * para requerimientos de actividades.
 * 
 * @module RequirementService
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Errores de negocio personalizados
 */
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessRuleError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Servicio de Requerimientos de Actividades
 * Maneja toda la lógica de negocio relacionada con requerimientos
 */
export class RequirementService {
  private readonly prisma = prisma;

  /**
   * Crear un nuevo requerimiento con actividades y adjuntos
   */
  async create(
    data: {
      title: string | null;
      masterActivityNameId?: string;
      masterActivityNameText?: string;
      priorityId: string;
      description: string;
      locationId?: string;
      areaId?: string;
      shipId?: string;
      estimatedDate?: string;
      estimatedTime?: string;
      applicantUserId: string;
      nombreSolicitante?: string;
      responsibleUserId?: string;
      estimatedValue?: number;
      actividades?: Array<{
        name: string;
        description?: string;
        locationId?: string;
        supplierId?: string;
        startDate?: string;
        endDate?: string;
        estimatedValue?: number;
        attachments?: any[];
      }>;
      adjuntos?: Array<{
        storagePath: string;
        publicUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
      }>;
    },
    userId: string,
    metadata?: { ip?: string; userAgent?: string }
  ) {
    // Validar reglas de negocio
    await this.validateBusinessRules(data);

    // Obtener siguiente folio
    const nextFolio = await this.getNextFolio();

    return await this.prisma.$transaction(async (tx) => {
      // 1. Crear requerimiento
      const requirement = await tx.actRequirement.create({
        data: {
          folio: nextFolio.folio,
          folioPrefix: nextFolio.prefix,
          title: data.title,
          masterActivityNameId: data.masterActivityNameId,
          masterActivityNameText: data.masterActivityNameText,
          priorityId: data.priorityId,
          description: data.description,
          locationId: data.locationId,
          areaId: data.areaId,
          shipId: data.shipId,
          estimatedDate: data.estimatedDate ? new Date(data.estimatedDate) : null,
          estimatedTime: data.estimatedTime,
          applicantUserId: data.applicantUserId,
          nombreSolicitante: data.nombreSolicitante,
          responsibleUserId: data.responsibleUserId,
          estimatedValue: data.estimatedValue,
          createdById: userId,
          activityTypeId: await this.getDefaultActivityTypeId(),
          statusId: await this.getDefaultStatusId(),
        },
      });

      // 2. Crear actividades asociadas
      if (data.actividades && data.actividades.length > 0) {
        await this.createActivities(tx, requirement.id, data.actividades);
      }

      // 3. Vincular adjuntos
      if (data.adjuntos && data.adjuntos.length > 0) {
        await this.attachFiles(tx, requirement.id, data.adjuntos, userId);
      }

      // 4. Registrar en timeline
      await tx.actTimeline.create({
        data: {
          requirementId: requirement.id,
          changedById: userId,
          action: "CREATE",
          comment: "Requerimiento creado",
        },
      });

      return requirement;
    });
  }

  /**
   * Actualizar un requerimiento existente
   */
  async update(
    requirementId: string,
    data: {
      title?: string | null;
      priorityId?: string;
      description?: string;
      locationId?: string;
      areaId?: string;
      shipId?: string;
      estimatedDate?: string;
      estimatedTime?: string;
      responsibleUserId?: string;
      actividades?: any[];
      adjuntos?: any[];
    },
    userId: string,
    metadata?: { ip?: string; userAgent?: string }
  ) {
    // Validar permisos y estado
    await this.validateUpdatePermissions(requirementId, userId);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Actualizar requerimiento
      const requirement = await tx.actRequirement.update({
        where: { id: requirementId },
        data: {
          title: data.title,
          priorityId: data.priorityId,
          description: data.description,
          locationId: data.locationId,
          areaId: data.areaId,
          shipId: data.shipId,
          estimatedDate: data.estimatedDate ? new Date(data.estimatedDate) : null,
          estimatedTime: data.estimatedTime,
          responsibleUserId: data.responsibleUserId,
          updatedAt: new Date(),
        },
      });

      // 2. Sincronizar actividades si se proporcionan
      if (data.actividades) {
        await this.syncActivities(tx, requirementId, data.actividades);
      }

      // 3. Vincular nuevos adjuntos
      if (data.adjuntos && data.adjuntos.length > 0) {
        await this.attachFiles(tx, requirementId, data.adjuntos, userId);
      }

      // 4. Timeline
      await tx.actTimeline.create({
        data: {
          requirementId,
          changedById: userId,
          action: "UPDATE",
          comment: "Requerimiento actualizado",
        },
      });

      return requirement;
    });
  }

  /**
   * Aprobar un requerimiento
   */
  async approve(requirementId: string, userId: string, metadata?: any) {
    const requirement = await this.prisma.actRequirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement) {
      throw new ValidationError("Requerimiento no encontrado");
    }

    if (requirement.isApproved) {
      throw new BusinessRuleError("El requerimiento ya está aprobado");
    }

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.actRequirement.update({
        where: { id: requirementId },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedById: userId,
        },
      });

      await tx.actTimeline.create({
        data: {
          requirementId,
          changedById: userId,
          action: "APPROVE",
          comment: "Requerimiento aprobado",
        },
      });

      return updated;
    });
  }

  /**
   * Validar reglas de negocio antes de crear/actualizar
   */
  private async validateBusinessRules(data: any) {
    // Validar monto estimado
    if (data.estimatedValue && data.estimatedValue > 10000000) {
      throw new BusinessRuleError(
        "Montos superiores a $10.000.000 requieren aprobación previa del área financiera"
      );
    }

    // Validar fechas
    if (data.estimatedDate && data.actividades) {
      const reqDate = new Date(data.estimatedDate);
      for (const activity of data.actividades) {
        if (activity.endDate) {
          const actDate = new Date(activity.endDate);
          if (actDate < reqDate) {
            throw new ValidationError(
              "La fecha de fin de actividad no puede ser anterior a la fecha estimada del requerimiento",
              "actividades"
            );
          }
        }
      }
    }
  }

  /**
   * Validar permisos de actualización
   */
  private async validateUpdatePermissions(requirementId: string, userId: string) {
    const requirement = await this.prisma.actRequirement.findUnique({
      where: { id: requirementId },
      select: {
        id: true,
        isApproved: true,
        userCheckRequerido: true,
        createdById: true,
      },
    });

    if (!requirement) {
      throw new ValidationError("Requerimiento no encontrado");
    }

    if (requirement.isApproved) {
      throw new BusinessRuleError("No se puede editar un requerimiento aprobado");
    }

    if (requirement.userCheckRequerido) {
      throw new BusinessRuleError(
        "No se puede editar un requerimiento con solicitud de revisión activa"
      );
    }
  }

  /**
   * Crear actividades asociadas al requerimiento
   */
  private async createActivities(
    tx: Prisma.TransactionClient,
    requirementId: string,
    activities: any[]
  ) {
    for (const activity of activities) {
      await tx.actActivity.create({
        data: {
          requirementId,
          name: activity.name,
          description: activity.description,
          locationId: activity.locationId,
          supplierId: activity.supplierId,
          startDate: activity.startDate ? new Date(activity.startDate) : null,
          endDate: activity.endDate ? new Date(activity.endDate) : null,
          estimatedValue: activity.estimatedValue,
          statusActivity: activity.statusActivity || "PENDIENTE",
        },
      });
    }
  }

  /**
   * Sincronizar actividades (actualizar existentes, crear nuevas, eliminar removidas)
   */
  private async syncActivities(
    tx: Prisma.TransactionClient,
    requirementId: string,
    activities: any[]
  ) {
    const existingIds = activities.filter((a) => a.id).map((a) => a.id);

    // Eliminar actividades que ya no están en la lista
    await tx.actActivity.deleteMany({
      where: {
        requirementId,
        id: { notIn: existingIds },
      },
    });

    // Actualizar o crear actividades
    for (const activity of activities) {
      if (activity.id) {
        // Actualizar existente
        await tx.actActivity.update({
          where: { id: activity.id },
          data: {
            name: activity.name,
            description: activity.description,
            locationId: activity.locationId,
            supplierId: activity.supplierId,
            startDate: activity.startDate ? new Date(activity.startDate) : null,
            endDate: activity.endDate ? new Date(activity.endDate) : null,
            estimatedValue: activity.estimatedValue,
            statusActivity: activity.statusActivity,
          },
        });
      } else {
        // Crear nueva
        await tx.actActivity.create({
          data: {
            requirementId,
            name: activity.name,
            description: activity.description,
            locationId: activity.locationId,
            supplierId: activity.supplierId,
            startDate: activity.startDate ? new Date(activity.startDate) : null,
            endDate: activity.endDate ? new Date(activity.endDate) : null,
            estimatedValue: activity.estimatedValue,
            statusActivity: activity.statusActivity || "PENDIENTE",
          },
        });
      }
    }
  }

  /**
   * Vincular archivos adjuntos al requerimiento
   */
  private async attachFiles(
    tx: Prisma.TransactionClient,
    requirementId: string,
    attachments: Array<{
      storagePath: string;
      publicUrl: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }>,
    userId: string
  ) {
    for (const file of attachments) {
      await tx.actAttachment.create({
        data: {
          requirementId,
          storagePath: file.storagePath,
          publicUrl: file.publicUrl,
          fileName: file.fileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          uploadedById: userId,
        },
      });
    }
  }

  /**
   * Obtener siguiente número de folio
   */
  private async getNextFolio() {
    const lastRequirement = await this.prisma.actRequirement.findFirst({
      orderBy: { folio: "desc" },
      select: { folio: true, folioPrefix: true },
    });

    return {
      folio: lastRequirement ? lastRequirement.folio + 1 : 1,
      prefix: lastRequirement?.folioPrefix || "REQ",
    };
  }

  /**
   * Obtener ID del tipo de actividad por defecto
   */
  private async getDefaultActivityTypeId() {
    const defaultType = await this.prisma.actActivityType.findFirst({
      where: { code: "GENERAL" },
    });
    if (!defaultType) {
      throw new Error("No se encontró el tipo de actividad por defecto");
    }
    return defaultType.id;
  }

  /**
   * Obtener ID del estado por defecto
   */
  private async getDefaultStatusId() {
    const defaultStatus = await this.prisma.actStatusReq.findFirst({
      where: { code: "PENDIENTE" },
    });
    if (!defaultStatus) {
      throw new Error("No se encontró el estado por defecto");
    }
    return defaultStatus.id;
  }
}

// Exportar instancia singleton
export const requirementService = new RequirementService();
