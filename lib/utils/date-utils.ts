import { format, differenceInDays, addMonths, isAfter } from "date-fns";
import { es } from "date-fns/locale";

export function formatDate(date: Date | string | null | undefined): string {
    if (!date) return "N/A";
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "dd/MM/yyyy", { locale: es });
}

export function getRemainingTime(endDate: Date | string | null | undefined): string {
    if (!endDate) return "Indefinida";
    const end = typeof endDate === "string" ? new Date(endDate) : endDate;
    const now = new Date();

    if (isAfter(now, end)) return "Expirada";

    const days = differenceInDays(end, now);

    if (days < 0) return "Expirada";
    if (days === 0) return "Expira hoy";
    if (days === 1) return "Expira mañana";

    if (days > 30) {
        const months = Math.floor(days / 30);
        const remainingDays = days % 30;
        if (remainingDays === 0) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
        return `${months} ${months === 1 ? 'mes' : 'meses'} y ${remainingDays} ${remainingDays === 1 ? 'día' : 'días'}`;
    }

    return `${days} ${days === 1 ? 'día' : 'días'}`;
}

export function formatDuration(months: number | null | undefined): string {
    if (months === null || months === undefined) return "Indefinida";
    if (months === 0) return "Sin vigencia";
    if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
    return `${years} ${years === 1 ? 'año' : 'años'} y ${remainingMonths} ${remainingMonths === 1 ? 'mes' : 'meses'}`;
}
