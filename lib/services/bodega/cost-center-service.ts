import { prisma } from "@/lib/prisma";

// ===========================================================================
// Servicio de Centros de Costo de Bodega
// Reemplaza el almacenamiento JSON en AppSetting por una tabla real en BD.
// ===========================================================================

export interface CostCenterCreateInput {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CostCenterUpdateInput {
  code?: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export const bodegaCostCenterService = {
  /**
   * Lista centros de costo con filtro opcional por búsqueda y estado.
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

    return prisma.bodegaCostCenter.findMany({
      where,
      orderBy: { name: "asc" },
    });
  },

  /**
   * Obtiene un centro de costo por ID.
   */
  async findById(id: string) {
    return prisma.bodegaCostCenter.findUnique({ where: { id } });
  },

  /**
   * Crea un nuevo centro de costo. Valida código único.
   */
  async create(data: CostCenterCreateInput) {
    const code = data.code.trim().toUpperCase();

    const existing = await prisma.bodegaCostCenter.findUnique({ where: { code } });
    if (existing) throw new Error("Ya existe un centro de costo con ese código");

    return prisma.bodegaCostCenter.create({
      data: {
        code,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isActive: data.isActive ?? true,
      },
    });
  },

  /**
   * Actualiza un centro de costo. Valida unicidad de código si cambia.
   */
  async update(id: string, data: CostCenterUpdateInput) {
    const current = await prisma.bodegaCostCenter.findUnique({ where: { id } });
    if (!current) throw new Error("Centro de costo no encontrado");

    if (data.code) {
      const code = data.code.trim().toUpperCase();
      const duplicate = await prisma.bodegaCostCenter.findFirst({
        where: { code, id: { not: id } },
      });
      if (duplicate) throw new Error("Ya existe un centro de costo con ese código");
      data.code = code;
    }

    return prisma.bodegaCostCenter.update({
      where: { id },
      data: {
        ...(data.code ? { code: data.code } : {}),
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  },

  /**
   * Elimina un centro de costo.
   */
  async delete(id: string) {
    const current = await prisma.bodegaCostCenter.findUnique({ where: { id } });
    if (!current) throw new Error("Centro de costo no encontrado");

    return prisma.bodegaCostCenter.delete({ where: { id } });
  },
};
