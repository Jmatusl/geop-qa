import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET() {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Obtener tipos de eventos únicos
        const eventTypes = await prisma.accessLog.findMany({
            select: { eventType: true },
            distinct: ['eventType'],
            orderBy: { eventType: 'asc' }
        });

        // Obtener módulos únicos
        const modules = await prisma.accessLog.findMany({
            where: { module: { not: null } },
            select: { module: true },
            distinct: ['module'],
            orderBy: { module: 'asc' }
        });

        // Obtener usuarios que han generado logs
        const users = await prisma.accessLog.findMany({
            where: { userId: { not: null } },
            select: {
                userId: true,
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            },
            distinct: ['userId'],
        });

        return NextResponse.json({
            eventTypes: eventTypes.map(e => e.eventType),
            modules: modules.map(m => m.module),
            users: users.map(u => ({
                id: u.userId,
                name: `${u.user?.firstName} ${u.user?.lastName}`,
                email: u.user?.email
            }))
        });

    } catch (error) {
        console.error("Error fetching audit metadata:", error);
        return NextResponse.json({ error: "Error fetching audit metadata" }, { status: 500 });
    }
}
