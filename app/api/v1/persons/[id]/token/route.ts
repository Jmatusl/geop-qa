import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { generateCredentialToken } from "@/lib/auth/credential-token";
import { AuditLogger } from "@/lib/audit/logger";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await verifySession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Verificar permisos:
        // 1. Admin puede generar para cualquiera
        // 2. Usuario puede generar SOLO para su persona vinculada

        // Buscar la persona y verificar vinculación
        const person = await prisma.person.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!person) return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });

        const isAdmin = session.user.roles.includes("ADMIN");
        const isOwner = person.user?.id === session.userId;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Leer certificationId opcional del body
        let certificationId: string | undefined;
        try {
            const body = await request.json();
            certificationId = body.certificationId;
        } catch (e) {
            // Body vacío o inválido, normal si no se envía nada
        }

        // Generar token (15 mins)
        // Usamos nuestra utilidad JWT stateless
        const token = await generateCredentialToken(id, certificationId, '15m');

        // Calcular fecha de expiración (15 minutos desde ahora)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // Log solo si es Admin (para evitar ruido si es el propio usuario generando su QR a cada rato)
        if (isAdmin) {
            await AuditLogger.logAction(request, session.userId, {
                action: "CREATE",
                module: "CredentialToken",
                targetId: id
            });
        }

        return NextResponse.json({ token, expiresAt });

    } catch (error) {
        console.error("Error generating token:", error);
        return NextResponse.json({ error: "Error al generar token" }, { status: 500 });
    }
}
