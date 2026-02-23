import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET() {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Obtener métricas en paralelo
        const [userCount, roleCount, activeSessions, recentLogs] = await Promise.all([
            prisma.user.count({ where: { isActive: true } }),
            prisma.role.count({ where: { isActive: true } }),
            prisma.session.findMany({
                where: {
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            avatarUrl: true
                        }
                    }
                },
                orderBy: {
                    lastActivityAt: 'desc'
                }
            }),
            prisma.accessLog.findMany({
                take: 10,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
        ]);

        return NextResponse.json({
            metrics: {
                users: userCount,
                roles: roleCount,
                sessions: activeSessions.length,
            },
            activeSessions: activeSessions,
            recentActivity: recentLogs,
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
