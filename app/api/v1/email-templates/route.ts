import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";


// GET: Listar templates
export async function GET(req: NextRequest) {
    try {
        const templates = await prisma.emailTemplate.findMany({
            orderBy: { name: 'asc' },
            include: {
                updatedBy: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        return NextResponse.json(templates);
    } catch (error) {
        console.error("Error fetching email templates:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

// PUT: Actualizar un template por ID
// NOTA: Para este endpoint específico, es mejor usar una ruta dinámica [id]/route.ts
// Pero dado que los mantenedores a veces usan endpoints generales con body ID,
// vamos a seguir la estructura anidada de Next.js creando la carpeta [id]
