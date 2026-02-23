import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // Filtros
        const userId = searchParams.get("userId");
        const eventType = searchParams.get("eventType");
        const module = searchParams.get("module");
        const fromDate = searchParams.get("from");
        const toDate = searchParams.get("to");
        const search = searchParams.get("search") || "";

        const where: any = {};

        if (userId && userId !== "all") where.userId = userId;
        if (eventType && eventType !== "all") where.eventType = eventType;
        if (module && module !== "all") where.module = module;

        if (fromDate || toDate) {
            where.createdAt = {};
            if (fromDate) where.createdAt.gte = new Date(fromDate);
            if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                where.createdAt.lte = to;
            }
        }

        if (search) {
            where.OR = [
                { ipAddress: { contains: search, mode: "insensitive" } },
                { userAgent: { contains: search, mode: "insensitive" } },
                { pageUrl: { contains: search, mode: "insensitive" } },
                {
                    user: {
                        OR: [
                            { firstName: { contains: search, mode: "insensitive" } },
                            { lastName: { contains: search, mode: "insensitive" } },
                            { email: { contains: search, mode: "insensitive" } }
                        ]
                    }
                }
            ];
        }

        const [total, logs] = await Promise.all([
            prisma.accessLog.count({ where }),
            prisma.accessLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            avatarUrl: true
                        }
                    }
                }
            })
        ]);

        return NextResponse.json({
            data: logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error fetching audit logs:", error);
        return NextResponse.json({ error: "Error fetching audit logs" }, { status: 500 });
    }
}
