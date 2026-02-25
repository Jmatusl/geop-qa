/**
 * Notification Service
 * 
 * Servicio para gestionar notificaciones basadas en permisos de usuario.
 * Implementa la lógica de decisión multi-nivel:
 * 1. ¿Notificación habilitada globalmente?
 * 2. ¿Usuario tiene permisos requeridos?
 * 3. ¿Usuario tiene opt-out activo?
 */

import { prisma } from "@/lib/prisma";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";

export interface UserNotificationConfig {
  moduleCode: string;
  moduleName: string;
  moduleIcon: string | null;
  notifications: {
    eventKey: string;
    eventName: string;
    description: string | null;
    isEnabledGlobally: boolean;
    isOptedOut: boolean;
    canReceive: boolean; // Resultado final: ¿usuario recibe esta notificación?
    requiredPermissions: string[];
  }[];
}

export class NotificationService {
  private readonly prisma = prisma;

  /**
   * Determina si un usuario debe recibir una notificación específica
   * 
   * @param userId - ID del usuario
   * @param moduleCode - Código del módulo (ej: 'actividades', 'mantencion')
   * @param eventKey - Clave del evento (ej: 'onNewRequest', 'onApproval')
   * @returns {Promise<boolean>} - true si el usuario debe recibir la notificación
   */
  async shouldUserReceiveNotification(
    userId: string,
    moduleCode: string,
    eventKey: string
  ): Promise<boolean> {
    // 1. Verificar si el módulo está activo y tiene notificaciones habilitadas
    const module = await this.prisma.module.findUnique({
      where: { code: moduleCode },
      select: { 
        isActive: true, 
        emailEnabled: true,
      },
    });

    if (!module || !module.isActive || !module.emailEnabled) {
      return false;
    }

    // 2. Obtener configuración de la notificación
    const notification = await this.prisma.moduleNotificationSetting.findFirst({
      where: {
        module: { code: moduleCode },
        eventKey,
      },
      select: {
        isEnabled: true,
        requiredPermissions: true,
      },
    });

    if (!notification || !notification.isEnabled) {
      return false;
    }

    // 3. Verificar que el usuario tenga al menos uno de los permisos requeridos
    if (notification.requiredPermissions.length > 0) {
      const hasPermission = await this.userHasAnyRequiredPermission(
        userId,
        moduleCode,
        notification.requiredPermissions
      );

      if (!hasPermission) {
        return false;
      }
    }

    // 4. Verificar si el usuario tiene opt-out activo
    const preference = await this.prisma.userNotificationPreference.findUnique({
      where: {
        userId_moduleCode_eventKey: {
          userId,
          moduleCode,
          eventKey,
        },
      },
      select: { isOptedOut: true },
    });

    if (preference?.isOptedOut) {
      return false;
    }

    // ✅ Usuario debe recibir la notificación
    return true;
  }

  /**
   * Verifica si un usuario tiene al menos uno de los permisos requeridos
   */
  private async userHasAnyRequiredPermission(
    userId: string,
    moduleCode: string,
    requiredPermissions: string[]
  ): Promise<boolean> {
    for (const permissionCode of requiredPermissions) {
      const hasPermission = await modulePermissionService.userHasPermission(
        userId,
        moduleCode,
        permissionCode
      );
      if (hasPermission) {
        return true;
      }
    }
    return false;
  }

  /**
   * Obtiene la configuración de notificaciones de un usuario filtrada por sus permisos
   * 
   * @param userId - ID del usuario
   * @returns {Promise<UserNotificationConfig[]>} - Configuración de notificaciones por módulo
   */
  async getUserNotificationConfig(userId: string): Promise<UserNotificationConfig[]> {
    // Obtener módulos activos con notificaciones
    const modules = await this.prisma.module.findMany({
      where: { isActive: true },
      include: {
        notificationSettings: {
          where: { isEnabled: true },
          orderBy: { eventKey: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    // Obtener permisos del usuario
    const userPermissions = await modulePermissionService.getAllUserPermissions(userId);

    // Obtener preferencias de opt-out del usuario
    const userPreferences = await this.prisma.userNotificationPreference.findMany({
      where: { userId },
      select: {
        moduleCode: true,
        eventKey: true,
        isOptedOut: true,
      },
    });

    const preferencesMap = new Map(
      userPreferences.map(p => [`${p.moduleCode}:${p.eventKey}`, p.isOptedOut])
    );

    // Construir configuración filtrada
    const config: UserNotificationConfig[] = [];

    for (const module of modules) {
      const modulePermissions = userPermissions[module.code] || [];

      // Filtrar notificaciones donde el usuario tiene al menos un permiso requerido
      const notifications = module.notificationSettings
        .filter(notif => {
          // Si no hay permisos requeridos, todos pueden ver
          if (notif.requiredPermissions.length === 0) return true;

          // Verificar si usuario tiene algún permiso requerido
          return notif.requiredPermissions.some(reqPerm =>
            modulePermissions.includes(reqPerm)
          );
        })
        .map(notif => {
          const isOptedOut = preferencesMap.get(`${module.code}:${notif.eventKey}`) || false;
          const canReceive = notif.isEnabled && !isOptedOut;

          return {
            eventKey: notif.eventKey,
            eventName: notif.eventName,
            description: notif.description,
            isEnabledGlobally: notif.isEnabled,
            isOptedOut,
            canReceive,
            requiredPermissions: notif.requiredPermissions,
          };
        });

      // Solo incluir módulo si el usuario tiene notificaciones disponibles
      if (notifications.length > 0) {
        config.push({
          moduleCode: module.code,
          moduleName: module.name,
          moduleIcon: module.icon,
          notifications,
        });
      }
    }

    return config;
  }

  /**
   * Establece la preferencia de opt-out de un usuario para una notificación
   * 
   * @param userId - ID del usuario
   * @param moduleCode - Código del módulo
   * @param eventKey - Clave del evento
   * @param isOptedOut - true para desactivar, false para activar
   */
  async setUserNotificationPreference(
    userId: string,
    moduleCode: string,
    eventKey: string,
    isOptedOut: boolean
  ): Promise<void> {
    await this.prisma.userNotificationPreference.upsert({
      where: {
        userId_moduleCode_eventKey: {
          userId,
          moduleCode,
          eventKey,
        },
      },
      create: {
        userId,
        moduleCode,
        eventKey,
        isOptedOut,
      },
      update: {
        isOptedOut,
      },
    });
  }

  /**
   * Obtiene todos los usuarios que deben recibir una notificación específica
   * 
   * @param moduleCode - Código del módulo
   * @param eventKey - Clave del evento
   * @returns {Promise<string[]>} - IDs de usuarios que deben recibir la notificación
   */
  async getUsersForNotification(
    moduleCode: string,
    eventKey: string
  ): Promise<string[]> {
    // Obtener configuración de la notificación
    const notification = await this.prisma.moduleNotificationSetting.findFirst({
      where: {
        module: { code: moduleCode, isActive: true, emailEnabled: true },
        eventKey,
        isEnabled: true,
      },
      select: {
        requiredPermissions: true,
      },
    });

    if (!notification) {
      return [];
    }

    // Obtener usuarios con los permisos requeridos
    const usersWithPermissions = await this.prisma.userModulePermission.findMany({
      where: {
        module: { code: moduleCode },
        permission: {
          code: { in: notification.requiredPermissions },
        },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });

    const candidateUserIds = usersWithPermissions.map(u => u.userId);

    if (candidateUserIds.length === 0) {
      return [];
    }

    // Filtrar usuarios con opt-out activo
    const optedOutUsers = await this.prisma.userNotificationPreference.findMany({
      where: {
        userId: { in: candidateUserIds },
        moduleCode,
        eventKey,
        isOptedOut: true,
      },
      select: { userId: true },
    });

    const optedOutUserIds = new Set(optedOutUsers.map(u => u.userId));

    return candidateUserIds.filter(userId => !optedOutUserIds.has(userId));
  }
}

export const notificationService = new NotificationService();
