import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const key = searchParams.get("key");

        const where: any = {};
        if (key) {
            where.key = { contains: key, mode: 'insensitive' };
        }

        const settings = await prisma.appSetting.findMany({
            where,
            orderBy: { key: 'asc' }
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error("Error fetching settings:", error);
        return NextResponse.json({ error: "Error fetching settings" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { key, value, description, isActive } = body;

        // Validar duplicados
        const existing = await prisma.appSetting.findUnique({ where: { key } });
        if (existing) {
            return NextResponse.json({ error: "La clave ya existe" }, { status: 400 });
        }

        // Asegurar que value sea JSON válido (aunque Prisma lo maneja, buena práctica validarlo)
        // body.value viene como objeto JS si el content-type es json

        const setting = await prisma.appSetting.create({
            data: {
                key,
                value: value ?? {}, // Default empty json
                description,
                isActive: isActive ?? true,
                version: 1,
            }
        });

        // Log the creation
        const session = await verifySession();
        await AuditLogger.logAction(request, session?.userId || null, {
            action: "CREATE",
            module: "Settings",
            targetId: setting.id,
            newData: { key, value, description, isActive }
        });

        return NextResponse.json(setting, { status: 201 });
    } catch (error) {
        console.error("Error creating setting:", error);
        return NextResponse.json({ error: "Error creating setting" }, { status: 500 });
    }
}
