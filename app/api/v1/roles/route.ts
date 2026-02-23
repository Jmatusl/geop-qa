import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const all = searchParams.get("all") === "true";
        const search = searchParams.get("search") || "";

        // Modo lista completa (para dropdowns)
        if (all) {
            const roles = await prisma.role.findMany({
                where: { isActive: true },
                orderBy: { createdAt: 'asc' }
            });
            return NextResponse.json(roles);
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

        const [total, roles] = await Promise.all([
            prisma.role.count({ where }),
            prisma.role.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'asc' }
            })
        ]);

        return NextResponse.json({
            data: roles,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error fetching roles:", error);
        return NextResponse.json({ error: "Error fetching roles" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { code, name, description } = body;

        // Validar unicidad de código
        const existing = await prisma.role.findUnique({
            where: { code }
        });

        if (existing) {
            return NextResponse.json({ error: "El código de rol ya existe" }, { status: 400 });
        }

        const role = await prisma.role.create({
            data: {
                code,
                name,
                description,
                isActive: true
            }
        });

        // Log the creation
        const session = await verifySession();
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "CREATE",
            module: "Roles",
            targetId: role.id,
            newData: { code, name, description, isActive: true }
        });

        return NextResponse.json(role, { status: 201 });
    } catch (error) {
        console.error("Error creating role:", error);
        return NextResponse.json({ error: "Error creating role" }, { status: 500 });
    }
}
