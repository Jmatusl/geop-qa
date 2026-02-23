import { prisma } from "@/lib/prisma";

/**
 * Valida si un usuario tiene acceso a una ruta específica basándose en sus roles
 * y los roles permitidos para ese ítem de menú.
 */
export async function validateMenuAccess(userId: string, path: string): Promise<boolean> {
    try {
        // 1. Obtener roles del usuario
        const userWithRoles = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                userRoles: {
                    include: {
                        role: true
                    }
                }
            }
        });

        if (!userWithRoles) return false;

        const userRoleCodes = userWithRoles.userRoles.map(ur => ur.role.code);

        // 2. Buscar ítem de menú que coincida con la ruta.
        // Buscamos coincidencia parcial (startsWith) para subrutas.

        // Buscar todos los ítems de menú activos que tengan ruta
        const menuItems = await prisma.menuItem.findMany({
            where: {
                enabled: true,
                path: {
                    not: null
                }
            }
        });

        // Buscar la coincidencia más específica
        const matchingItem = menuItems
            .filter(item => item.path && path.startsWith(item.path))
            .sort((a, b) => (b.path?.length || 0) - (a.path?.length || 0))[0];

        if (!matchingItem) {
            // Si no existe item, permitimos por defecto (ej: dashboard base)
            return true;
        }

        // 3. Verificar si algún rol del usuario está permitido
        if (matchingItem.roles.length === 0) {
            return true; // Si no hay roles definidos, es público (post-autenticación)
        }

        const hasAccess = userRoleCodes.some(roleCode => matchingItem.roles.includes(roleCode));

        return hasAccess;
    } catch (error) {
        console.error("Error validating menu access:", error);
        return false; // Denegar en caso de error
    }
}
