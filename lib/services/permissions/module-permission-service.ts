/**
 * Service Layer - Permisos por Módulo
 *
 * Centraliza la lógica de negocio para gestión de permisos operativos
 * en los diferentes módulos del sistema (actividades, mantención, etc.)
 *
 * @module ModulePermissionService
 */

import { prisma } from "@/lib/prisma";

/**
 * Errores personalizados para permisos
 */
export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export class ModuleNotFoundError extends Error {
  constructor(moduleCode: string) {
    super(`Módulo '${moduleCode}' no encontrado`);
    this.name = "ModuleNotFoundError";
  }
}

/**
 * Servicio de Permisos por Módulo
 */
export class ModulePermissionService {
  private readonly prisma = prisma;

  /**
   * Verificar si un usuario tiene un permiso específico en un módulo
   *
   * @param userId - ID del usuario
   * @param moduleCode - Código del módulo (ej: 'actividades', 'mantencion')
   * @param permissionCode - Código del permiso (ej: 'autoriza', 'chequea')
   * @returns true si el usuario tiene el permiso activo
   */
  async userHasPermission(userId: string, moduleCode: string, permissionCode: string): Promise<boolean> {
    try {
      const permission = await this.prisma.userModulePermission.findFirst({
        where: {
          userId,
          module: {
            code: moduleCode,
            isActive: true,
          },
          permission: {
            code: permissionCode,
            isActive: true,
          },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });

      if (permission) return true;

      if (moduleCode === "bodega" && permissionCode !== "administrador_bodega") {
        const adminPerm = await this.prisma.userModulePermission.findFirst({
          where: {
            userId,
            module: { code: moduleCode, isActive: true },
            permission: { code: "administrador_bodega", isActive: true },
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        });
        if (adminPerm) return true;
      }

      return false;
    } catch (error) {
      console.error(`[ModulePermissionService] Error verificando permiso:`, error);
      return false;
    }
  }

  /**
   * Obtener todos los permisos activos de un usuario en un módulo
   *
   * @param userId - ID del usuario
   * @param moduleCode - Código del módulo
   * @returns Array de códigos de permisos
   */
  async getUserPermissions(userId: string, moduleCode: string): Promise<string[]> {
    try {
      const permissions = await this.prisma.userModulePermission.findMany({
        where: {
          userId,
          module: {
            code: moduleCode,
            isActive: true,
          },
          permission: { isActive: true },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: {
          permission: {
            select: { code: true },
          },
        },
        orderBy: {
          permission: {
            displayOrder: "asc",
          },
        },
      });

      return permissions.map((p) => p.permission.code);
    } catch (error) {
      console.error(`[ModulePermissionService] Error obteniendo permisos:`, error);
      return [];
    }
  }

  /**
   * Obtener todos los permisos de un usuario en todos los módulos
   *
   * @param userId - ID del usuario
   * @returns Map de moduleCode → permissionCodes[]
   */
  async getAllUserPermissions(userId: string): Promise<Record<string, string[]>> {
    try {
      const permissions = await this.prisma.userModulePermission.findMany({
        where: {
          userId,
          module: { isActive: true },
          permission: { isActive: true },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: {
          module: {
            select: { code: true },
          },
          permission: {
            select: { code: true },
          },
        },
      });

      const permissionMap: Record<string, string[]> = {};

      for (const perm of permissions) {
        const moduleCode = perm.module.code;
        if (!permissionMap[moduleCode]) {
          permissionMap[moduleCode] = [];
        }
        permissionMap[moduleCode].push(perm.permission.code);
      }

      return permissionMap;
    } catch (error) {
      console.error(`[ModulePermissionService] Error obteniendo todos los permisos:`, error);
      return {};
    }
  }

  /**
   * Otorgar permisos a un usuario
   *
   * @param userId - ID del usuario que recibirá los permisos
   * @param moduleCode - Código del módulo
   * @param permissionCodes - Array de códigos de permisos a otorgar
   * @param grantedBy - ID del usuario que otorga los permisos
   * @param expiresAt - Fecha de expiración opcional
   */
  async grantPermissions(userId: string, moduleCode: string, permissionCodes: string[], grantedBy: string, expiresAt?: Date): Promise<void> {
    // 1. Obtener módulo y permisos
    const module = await this.prisma.module.findUnique({
      where: {
        code: moduleCode,
        isActive: true,
      },
      include: {
        permissions: {
          where: {
            code: { in: permissionCodes },
            isActive: true,
          },
        },
      },
    });

    if (!module) {
      throw new ModuleNotFoundError(moduleCode);
    }

    if (module.permissions.length === 0) {
      throw new PermissionError("No se encontraron permisos válidos para otorgar");
    }

    // 2. Transacción para otorgar permisos
    await this.prisma.$transaction(
      module.permissions.map((perm) =>
        this.prisma.userModulePermission.upsert({
          where: {
            userId_permissionId: {
              userId,
              permissionId: perm.id,
            },
          },
          create: {
            userId,
            moduleId: module.id,
            permissionId: perm.id,
            grantedBy,
            expiresAt,
          },
          update: {
            grantedBy,
            grantedAt: new Date(),
            expiresAt,
          },
        }),
      ),
    );
  }

  /**
   * Revocar permisos específicos de un usuario
   *
   * @param userId - ID del usuario
   * @param moduleCode - Código del módulo
   * @param permissionCodes - Array de códigos de permisos a revocar
   */
  async revokePermissions(userId: string, moduleCode: string, permissionCodes: string[]): Promise<void> {
    await this.prisma.userModulePermission.deleteMany({
      where: {
        userId,
        module: { code: moduleCode },
        permission: { code: { in: permissionCodes } },
      },
    });
  }

  /**
   * Revocar todos los permisos de un usuario en un módulo
   *
   * @param userId - ID del usuario
   * @param moduleCode - Código del módulo
   */
  async revokeAllPermissions(userId: string, moduleCode: string): Promise<void> {
    await this.prisma.userModulePermission.deleteMany({
      where: {
        userId,
        module: { code: moduleCode },
      },
    });
  }

  /**
   * Sincronizar permisos de un usuario en un módulo
   * (Otorgar los especificados, revocar el resto)
   *
   * @param userId - ID del usuario
   * @param moduleCode - Código del módulo
   * @param permissionCodes - Array de códigos de permisos que debe tener
   * @param grantedBy - ID del usuario que realiza la acción
   */
  async syncPermissions(userId: string, moduleCode: string, permissionCodes: string[], grantedBy: string): Promise<void> {
    // 1. Obtener módulo y permisos
    const module = await this.prisma.module.findUnique({
      where: {
        code: moduleCode,
        isActive: true,
      },
      include: {
        permissions: {
          where: { isActive: true },
        },
      },
    });

    if (!module) {
      throw new ModuleNotFoundError(moduleCode);
    }

    // 2. Determinar permisos a otorgar y revocar
    const allPermissionCodes = module.permissions.map((p) => p.code);
    const toRevoke = allPermissionCodes.filter((code) => !permissionCodes.includes(code));

    // 3. Transacción
    await this.prisma.$transaction(async (tx) => {
      // Revocar permisos no seleccionados
      if (toRevoke.length > 0) {
        await tx.userModulePermission.deleteMany({
          where: {
            userId,
            module: { code: moduleCode },
            permission: { code: { in: toRevoke } },
          },
        });
      }

      // Otorgar permisos seleccionados
      const permissionsToGrant = module.permissions.filter((p) => permissionCodes.includes(p.code));

      for (const perm of permissionsToGrant) {
        await tx.userModulePermission.upsert({
          where: {
            userId_permissionId: {
              userId,
              permissionId: perm.id,
            },
          },
          create: {
            userId,
            moduleId: module.id,
            permissionId: perm.id,
            grantedBy,
          },
          update: {
            grantedBy,
            grantedAt: new Date(),
          },
        });
      }
    });
  }

  /**
   * Obtener todos los módulos activos con sus permisos
   *
   * @returns Array de módulos con permisos
   */
  async getModulesWithPermissions() {
    return await this.prisma.module.findMany({
      where: { isActive: true },
      include: {
        permissions: {
          where: { isActive: true },
          orderBy: [{ category: "asc" }, { displayOrder: "asc" }],
        },
      },
      orderBy: { displayOrder: "asc" },
    });
  }

  /**
   * Obtener un módulo específico con sus permisos
   *
   * @param moduleCode - Código del módulo
   * @returns Módulo con permisos o null
   */
  async getModuleWithPermissions(moduleCode: string) {
    return await this.prisma.module.findUnique({
      where: {
        code: moduleCode,
        isActive: true,
      },
      include: {
        permissions: {
          where: { isActive: true },
          orderBy: [{ category: "asc" }, { displayOrder: "asc" }],
        },
      },
    });
  }

  /**
   * Limpiar permisos expirados (para ejecutar en cron)
   */
  async cleanupExpiredPermissions(): Promise<number> {
    const result = await this.prisma.userModulePermission.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    return result.count;
  }
}

/**
 * Instancia singleton del servicio
 */
export const modulePermissionService = new ModulePermissionService();
