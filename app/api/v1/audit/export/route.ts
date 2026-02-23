import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { format } from "date-fns";
import { AuditExcelReport } from "@/lib/reports/modules/audit/audit-excel";

export async function POST(request: NextRequest) {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { filters } = body;

        // 1. Obtener datos filtrados
        const where: any = {};
        if (filters.userId && filters.userId !== "all") where.userId = filters.userId;
        if (filters.eventType && filters.eventType !== "all") where.eventType = filters.eventType;
        if (filters.module && filters.module !== "all") where.module = filters.module;

        if (filters.from || filters.to) {
            where.createdAt = {};
            if (filters.from) where.createdAt.gte = new Date(filters.from);
            if (filters.to) {
                const to = new Date(filters.to);
                to.setHours(23, 59, 59, 999);
                where.createdAt.lte = to;
            }
        }

        const logs = await prisma.accessLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        // 2. Generar Reporte usando el nuevo Engine
        const report = new AuditExcelReport();
        await report.addData(logs);
        const buffer = await report.getBuffer();

        // 3. Retornar buffer
        return new NextResponse(buffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="auditoria_${format(new Date(), "yyyyMMdd")}.xlsx"`,
            },
        });

    } catch (error) {
        console.error("Error generating audit export:", error);
        return NextResponse.json({ error: "Error generating export" }, { status: 500 });
    }
}
