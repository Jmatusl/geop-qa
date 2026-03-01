import { prisma } from "@/lib/prisma";

// ===========================================================================
// Servicio de Motivos de Ajuste de Bodega
// Reemplaza el almacenamiento JSON en AppSetting por una tabla real en BD.
// ===========================================================================

export interface AdjustmentReasonCreateInput {
  code: string;
  name: string;
  type: string;
  description?: string | null;
  isActive?: boolean;
}

export interface AdjustmentReasonUpdateInput {
  code?: string;
  name?: string;
  type?: string;
  description?: string | null;
  isActive?: boolean;
}

export const bodegaAdjustmentReasonService = {
  /**
   * Lista motivos de ajuste con filtro opcional por búsqueda y estado.
   */
  async list(search = "", activeOnly?: boolean) {
    const where = {
      ...(search
        ? {
            OR: [{ code: { contains: search, mode: "insensitive" as const } }, { name: { contains: search, mode: "insensitive" as const } }],
          }
        : {}),
      ...(activeOnly !== undefined ? { isActive: activeOnly } : {}),
    };

    return prisma.bodegaAdjustmentReason.findMany({
      where,
      orderBy: { name: "asc" },
    });
  },

  /**
   * Obtiene un motivo por ID.
   */
  async findById(id: string) {
    return prisma.bodegaAdjustmentReason.findUnique({ where: { id } });
  },

  /**
   * Crea un nuevo motivo de ajuste. Valida código único.
   */
  async create(data: AdjustmentReasonCreateInput) {
    const code = data.code.trim().toUpperCase();

    const existing = await prisma.bodegaAdjustmentReason.findUnique({ where: { code } });
    if (existing) throw new Error("Ya existe un motivo de ajuste con ese código");

    return prisma.bodegaAdjustmentReason.create({
      data: {
        code,
        name: data.name.trim(),
        type: data.type.trim().toUpperCase(),
        description: data.description?.trim() || null,
        isActive: data.isActive ?? true,
      },
    });
  },

  /**
   * Actualiza un motivo de ajuste. Valida unicidad de código si cambia.
   */
  async update(id: string, data: AdjustmentReasonUpdateInput) {
    const current = await prisma.bodegaAdjustmentReason.findUnique({ where: { id } });
    if (!current) throw new Error("Motivo de ajuste no encontrado");

    if (data.code) {
      const code = data.code.trim().toUpperCase();
      const duplicate = await prisma.bodegaAdjustmentReason.findFirst({
        where: { code, id: { not: id } },
      });
      if (duplicate) throw new Error("Ya existe un motivo de ajuste con ese código");
      data.code = code;
    }

    return prisma.bodegaAdjustmentReason.update({
      where: { id },
      data: {
        ...(data.code ? { code: data.code } : {}),
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.type ? { type: data.type.trim().toUpperCase() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  },

  /**
   * Elimina un motivo de ajuste.
   */
  async delete(id: string) {
    const current = await prisma.bodegaAdjustmentReason.findUnique({ where: { id } });
    if (!current) throw new Error("Motivo de ajuste no encontrado");

    return prisma.bodegaAdjustmentReason.delete({ where: { id } });
  },
};
