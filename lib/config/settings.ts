import { prisma } from "@/lib/prisma";
import securityFallback from "./security-fallback.json";

/**
 * Obtiene una configuración desde la base de datos o retorna el fallback.
 * @param key Clave de la configuración
 * @param fallbackValue Valor por defecto si no existe en DB
 */
export async function getSetting<T>(key: string, fallbackValue: T): Promise<T> {
    try {
        const setting = await prisma.appSetting.findUnique({
            where: { key },
        });

        if (!setting) return fallbackValue;

        return setting.value as T;
    } catch (error) {
        console.error(`Error al obtener setting ${key}:`, error);
        return fallbackValue;
    }
}

/**
 * Obtiene las políticas de seguridad combinando DB y fallback.
 */
export async function getSecurityConfig() {
    const policies = await getSetting("SECURITY_POLICIES", securityFallback.SECURITY_POLICIES);
    const messages = await getSetting("SECURITY_MESSAGES", securityFallback.SECURITY_MESSAGES);

    return {
        policies,
        messages
    };
}
