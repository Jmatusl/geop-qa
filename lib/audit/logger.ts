import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/utils/request";
import { NextRequest } from "next/server";

export type AuditEventType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  | "SETTINGS_CHANGE"
  | "PASSWORD_RESET_REQUEST"
  | "PASSWORD_RESET_COMPLETE"
  | "ACCOUNT_ACTIVATED"
  | "ACCOUNT_UNLOCKED"
  | "DISABLE"
  | "SUSPEND"
  | "REACTIVATE"
  | "CREATE_RESOLUTION"
  | "UPDATE_RESOLUTION"
  | "UPDATE_RESOLUTION"
  | "GENERATE_CREDENTIAL_TOKEN"
  | "GEO_CHECKIN"
  | "VIEW_CREDENTIAL"
  | "CRON_EXECUTION"
  | "MANUAL_CRON_EXECUTION"
  | "SECURITY_EVENT";

export class AuditLogger {
  /**
   * Estandariza la creación de un log de auditoría.
   */
  static async log(params: { request: NextRequest; userId?: string | null; eventType: AuditEventType | string; module: string; pageUrl?: string; statusCode?: number; metadata?: any }) {
    try {
      const { request, userId, eventType, module, pageUrl, statusCode, metadata } = params;

      const ipAddress = getClientIp(request);
      const userAgent = request.headers.get("user-agent") || "Unknown";
      const endpoint = `${request.method} ${request.nextUrl.pathname}`;

      return await prisma.accessLog.create({
        data: {
          userId: userId || null,
          eventType,
          module,
          pageUrl: pageUrl || request.headers.get("referer") || null,
          endpoint,
          httpMethod: request.method,
          statusCode: statusCode || 200,
          ipAddress,
          userAgent,
          metadata: metadata || null,
        },
      });
    } catch (error) {
      console.error("CRITICAL: Failed to create audit log:", error);
      // No lanzamos el error para no interrumpir el flujo principal de la aplicación,
      // pero lo dejamos en consola.
    }
  }

  /**
   * Wrapper específico para acciones CRUD
   */
  static async logAction(
    request: NextRequest,
    userId: string | null,
    {
      action,
      module,
      targetId,
      newData,
      oldData,
    }: {
      action:
        | "CREATE"
        | "UPDATE"
        | "DELETE"
        | "DISABLE"
        | "SUSPEND"
        | "REACTIVATE"
        | "CREATE_RESOLUTION"
        | "UPDATE_RESOLUTION"
        | "GENERATE_CREDENTIAL_TOKEN"
        | "GEO_CHECKIN"
        | "UPDATE_AVATAR"
        | "DELETE_AVATAR"
        | "UPDATE_USER_AVATAR"
        | "DELETE_USER_AVATAR";
      module: string;
      targetId: string;
      newData?: any;
      oldData?: any;
    },
  ) {
    return this.log({
      request,
      userId,
      eventType: action,
      module,
      metadata: {
        targetId,
        ...(newData && { newData }),
        ...(oldData && { oldData }),
      },
    });
  }
}
