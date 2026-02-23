import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Utilidad para aplanar árboles (usada en MenusPage y MenuForm)
export function flattenTree(items: any[], depth = 0): any[] {
    return items.reduce((acc: any[], item) => {
        const flatItem = { ...item, depth };
        acc.push(flatItem);
        if (item.children && item.children.length > 0) {
            acc.push(...flattenTree(item.children, depth + 1));
        }
        return acc;
    }, []);
}
