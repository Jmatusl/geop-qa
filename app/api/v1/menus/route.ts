import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const roleStr = searchParams.get("roles");
        const onlyEnabled = searchParams.get("enabled") === "true";

        // Filtrado por roles
        let userRoles: string[] = [];

        if (roleStr) {
            userRoles = roleStr.split(',');
        } else {
            // Si no se proveen roles, intentar obtener de la sesión
            const session = await verifySession();
            if (session) {
                // Obtener los códigos de los roles del usuario desde la DB
                const dbUser = await prisma.user.findUnique({
                    where: { id: session.userId },
                    include: {
                        userRoles: {
                            include: {
                                role: true
                            }
                        }
                    }
                });

                if (dbUser) {
                    userRoles = dbUser.userRoles.map(ur => ur.role.code);
                }
            }
        }

        // Construir where clause base
        const where: any = {};
        if (onlyEnabled) where.enabled = true;

        // Obtener todos los items planos primero
        const allItems = await prisma.menuItem.findMany({
            where,
            orderBy: { order: 'asc' }
        });

        // Filtrado por roles
        // La lógica de roles en menús: "tiene AL MENOS UNO de los roles permitidos"
        let filteredItems = allItems;
        if (userRoles.length > 0) {
            filteredItems = allItems.filter(item => {
                // Si el item no tiene roles definidos o está vacío, es público para autenticados
                if (!item.roles || item.roles.length === 0) return true;
                // Si tiene roles, usuario debe tener al menos uno
                return item.roles.some(r => userRoles.includes(r));
            });
        }

        // Construir árbol jerárquico
        // 1. Map ID -> Item
        const itemMap = new Map();
        filteredItems.forEach(item => {
            // Inicializar propiedad children
            itemMap.set(item.id, { ...item, children: [] });
        });

        // 2. Asociar padres e hijos
        const rootItems: any[] = [];
        itemMap.forEach(item => {
            if (item.parentId && itemMap.has(item.parentId)) {
                itemMap.get(item.parentId).children.push(item);
            } else {
                rootItems.push(item);
            }
        });

        // 3. Ordenar recursivamente (aunque ya vienen ordenados por DB, al agrupar podría perderse)
        const sortItems = (items: any[]) => {
            items.sort((a, b) => a.order - b.order);
            items.forEach(i => {
                if (i.children.length > 0) sortItems(i.children);
            });
        };
        sortItems(rootItems);

        return NextResponse.json(rootItems);

    } catch (error) {
        console.error("Error fetching menus:", error);
        return NextResponse.json({ error: "Error al obtener menús" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { key, title, icon, path, parentId, order, roles, showIcon, enabled } = body;

        // Validar key única
        const existingKey = await prisma.menuItem.findUnique({ where: { key } });
        if (existingKey) {
            return NextResponse.json({ error: "La clave (key) del menú ya existe" }, { status: 400 });
        }

        // Determinar orden si no viene
        let finalOrder = order;
        if (finalOrder === undefined) {
            // Buscar max order en el mismo nivel
            const maxOrder = await prisma.menuItem.findFirst({
                where: { parentId: parentId || null },
                orderBy: { order: 'desc' }
            });
            finalOrder = (maxOrder?.order ?? 0) + 1;
        }

        const menuItem = await prisma.menuItem.create({
            data: {
                key,
                title,
                icon,
                path,
                parentId,
                order: finalOrder,
                roles: roles || [],
                showIcon: showIcon ?? true,
                enabled: enabled ?? true
            }
        });

        // Registrar creación
        const session = await verifySession();
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "CREATE",
            module: "Menus",
            targetId: menuItem.id,
            newData: { key, title, path, roles, enabled }
        });

        return NextResponse.json(menuItem, { status: 201 });
    } catch (error) {
        console.error("Error creating menu item:", error);
        return NextResponse.json({ error: "Error al crear ítem de menú" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { items } = body; // Array de { id, parentId, order }

        if (!Array.isArray(items)) {
            return NextResponse.json({ error: "Se requiere un array de items" }, { status: 400 });
        }

        const session = await verifySession();

        // Registrar estado actual para auditoría
        const previousItems = await prisma.menuItem.findMany();

        await prisma.$transaction(async (tx) => {
            for (const item of items) {
                await tx.menuItem.update({
                    where: { id: item.id },
                    data: {
                        parentId: item.parentId || null,
                        order: item.order
                    }
                });
            }
        });

        const newItems = await prisma.menuItem.findMany();

        // Registrar cambio estructural
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "UPDATE",
            module: "Menus",
            targetId: "SYSTEM_REORDER",
            newData: { itemsCount: items.length },
            oldData: { itemsCount: items.length }
        });

        // Auditoría específica de menú para versionado (según RF-016.5)
        await prisma.menuAudit.create({
            data: {
                previousJson: previousItems as any,
                newJson: newItems as any,
                changedById: session?.userId || "", // Fallback if no session but ideally protected
                changeReason: "Reordenamiento visual"
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error reordering menus:", error);
        return NextResponse.json({ error: "Error al reordenar menús" }, { status: 500 });
    }
}
