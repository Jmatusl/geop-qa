import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";

export async function GET(request: NextRequest) {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const all = searchParams.get("all") === "true";
        const search = searchParams.get("search") || "";

        // Modo lista completa (para dropdowns)
        if (all) {
            const reasons = await prisma.userDeactivationReason.findMany({
                where: { isActive: true },
                orderBy: { displayOrder: 'asc' }
            });
            return NextResponse.json(reasons);
        }

        // Modo Pagina (para tabla)
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { code: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } }
            ];
        }

        const [total, reasons] = await Promise.all([
            prisma.userDeactivationReason.count({ where }),
            prisma.userDeactivationReason.findMany({
                where,
                skip,
                take: limit,
                orderBy: [
                    { displayOrder: 'asc' },
                    { name: 'asc' }
                ]
            })
        ]);

        return NextResponse.json({
            data: reasons,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error fetching deactivation reasons:", error);
        return NextResponse.json({ error: "Error fetching deactivation reasons" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { code, name, description, displayOrder, isActive } = body;

        // Validar unicidad de código
        const existing = await prisma.userDeactivationReason.findUnique({
            where: { code }
        });

        if (existing) {
            return NextResponse.json({ error: "El código de motivo ya existe" }, { status: 400 });
        }

        const reason = await prisma.userDeactivationReason.create({
            data: {
                code,
                name,
                description,
                displayOrder: displayOrder ? parseInt(displayOrder) : 0,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        // Log the creation
        await AuditLogger.logAction(request, session.userId, {
            action: "CREATE",
            module: "DeactivationReasons",
            targetId: reason.id,
            newData: { code, name, description, displayOrder, isActive }
        });

        return NextResponse.json(reason, { status: 201 });
    } catch (error) {
        console.error("Error creating deactivation reason:", error);
        return NextResponse.json({ error: "Error creating deactivation reason" }, { status: 500 });
    }
}
