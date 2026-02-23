import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const updateSchema = z.object({
    subject: z.string().min(1, "El asunto es requerido"),
    htmlContent: z.string().min(1, "El contenido HTML es requerido"),
    description: z.string().optional(),
});

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        // Validar input
        const result = updateSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Datos inválidos", details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { subject, htmlContent, description } = result.data;

        // Verificar existencia
        const existing = await prisma.emailTemplate.findUnique({
            where: { id }
        });

        if (!existing) {
            return NextResponse.json({ error: "Template no encontrado" }, { status: 404 });
        }

        const updated = await prisma.emailTemplate.update({
            where: { id },
            data: {
                subject,
                htmlContent,
                description,
                updatedById: session.user.id
            }
        });

        return NextResponse.json(updated);

    } catch (error) {
        console.error("Error updating email template:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
