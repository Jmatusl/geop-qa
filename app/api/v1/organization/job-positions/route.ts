import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";
import { jobPositionSchema } from "@/lib/validations/organization";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const all = searchParams.get("all") === "true";
        const search = searchParams.get("search") || "";
        const isActiveParam = searchParams.get("isActive");

        const where: any = {};

        if (isActiveParam !== null) {
            where.isActive = isActiveParam === "true";
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { code: { contains: search, mode: "insensitive" } }
            ];
        }

        // Modo lista completa (para dropdowns)
        if (all) {
            const items = await prisma.jobPosition.findMany({
                where: { ...where, isActive: true },
                orderBy: { name: 'asc' }
            });
            return NextResponse.json(items);
        }

        // Modo Pagina (para tabla)
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        const [total, items] = await Promise.all([
            prisma.jobPosition.count({ where }),
            prisma.jobPosition.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return NextResponse.json({
            data: items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error fetching job positions:", error);
        return NextResponse.json({ error: "Error fetching job positions" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const validation = jobPositionSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos", details: validation.error.errors }, { status: 400 });
        }

        const { code, name, isActive } = validation.data;

        // Validar unicidad de código
        const existing = await prisma.jobPosition.findUnique({
            where: { code }
        });

        if (existing) {
            return NextResponse.json({ error: "El código ya existe" }, { status: 400 });
        }

        const jobPosition = await prisma.jobPosition.create({
            data: {
                code,
                name,
                isActive: isActive ?? true
            }
        });

        // Log the creation
        const session = await verifySession();
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "CREATE",
            module: "JobPositions",
            targetId: jobPosition.id,
            newData: { code, name, isActive }
        });

        return NextResponse.json(jobPosition, { status: 201 });
    } catch (error) {
        console.error("Error creating job position:", error);
        return NextResponse.json({ error: "Error creating job position" }, { status: 500 });
    }
}
