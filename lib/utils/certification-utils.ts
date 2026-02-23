import { differenceInDays, isBefore, isAfter, startOfDay } from "date-fns";

export type CertificationStatusKey =
    | "VIGENTE"
    | "VENCIDA"
    | "POR_VENCER"
    | "SUSPENDIDA"
    | "DESHABILITADA"
    | "ANULADA";

interface CertificationData {
    isActive: boolean;
    isDisabled: boolean;
    suspensionStartDate?: Date | null;
    suspensionEndDate?: Date | null;
    workerResolution: {
        validityEndDate: Date | null;
    };
}

/**
 * Calcula el estado de una certificación basado en sus fechas y banderas.
 * Esta es la ÚNICA fuente de verdad para el cálculo de estados.
 */
export function calculateCertificationStatus(cert: CertificationData): CertificationStatusKey {
    if (!cert.isActive) return "ANULADA";

    const today = startOfDay(new Date());

    // 1. Si está deshabilitada (isDisabled: true)
    if (cert.isDisabled) {
        // Verificar si es una suspensión activa
        if (cert.suspensionStartDate && cert.suspensionEndDate) {
            const start = startOfDay(cert.suspensionStartDate);
            const end = startOfDay(cert.suspensionEndDate);

            if (today >= start && today <= end) {
                return "SUSPENDIDA";
            }
        }
        return "DESHABILITADA";
    }

    // 2. Si no tiene fecha de vencimiento (Resolución indefinida)
    if (!cert.workerResolution.validityEndDate) {
        return "VIGENTE";
    }

    const expiryDate = startOfDay(cert.workerResolution.validityEndDate);

    // 3. Si ya venció
    if (today > expiryDate) {
        return "VENCIDA";
    }

    // 4. Si está por vencer (<= 30 días)
    const daysToExpiry = differenceInDays(expiryDate, today);
    if (daysToExpiry <= 30) {
        return "POR_VENCER";
    }

    return "VIGENTE";
}
