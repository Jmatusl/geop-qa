import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { AuditLogger } from "@/lib/audit/logger";

/**
 * POST /api/v1/audit/credential-view
 * Registra el evento de visualización de una credencial digital
 */
export async function POST(request: NextRequest) {
    try {
        const session = await verifySession();

        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await request.json();
        const { certificationId, certificationName, certificationCode } = body;

        if (!certificationId) {
            return NextResponse.json(
                { error: "certificationId es requerido" },
                { status: 400 }
            );
        }

        // Registrar evento de auditoría
        await AuditLogger.log({
            request,
            userId: session.userId,
            eventType: "VIEW_CREDENTIAL",
            module: "Credenciales",
            pageUrl: "/credencial",
            statusCode: 200,
            metadata: {
                certificationId,
                certificationName: certificationName || null,
                certificationCode: certificationCode || null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error al registrar visualización de credencial:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
