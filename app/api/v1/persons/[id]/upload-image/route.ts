import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { getSignedUploadUrl, uploadFile } from "@/lib/storage/r2";
import { AuditLogger } from "@/lib/audit/logger";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await verifySession();

        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
        }

        // Load Configuration
        const settings = await prisma.appSetting.findUnique({
            where: { key: "PERSON_IMAGE_CONFIG" }
        });
        const config = (settings?.value as any) || {
            maxSizeKb: 3000,
            allowedFormats: ["image/jpeg", "image/png", "image/webp"]
        };

        // Validate
        if (file.size > config.maxSizeKb * 1024) {
            return NextResponse.json({ error: "Imagen demasiado grande" }, { status: 400 });
        }

        const person = await prisma.person.findUnique({ where: { id } });
        if (!person) return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });

        // Process and Upload
        const buffer = Buffer.from(await file.arrayBuffer());
        const timestamp = Date.now();
        const cleanRut = person.rut.replace(/[^0-9kK]/g, "");
        const extension = file.type.split("/")[1] || "jpg";
        const key = `persons/${cleanRut}_${timestamp}.${extension}`;

        await uploadFile(key, buffer, file.type);

        // Determine Public URL
        const storageSettings = await prisma.appSetting.findUnique({
            where: { key: "STORAGE_CONFIG" }
        });
        const publicUrlBase = (storageSettings?.value as any)?.public_url || "https://pub-c7d36032b6b6480a9370dcdecd00059d.r2.dev";
        const finalPublicUrl = `${publicUrlBase}/${key}`;

        // Audit and Update DB
        const updatedPerson = await prisma.$transaction(async (tx) => {
            const p = await tx.person.update({
                where: { id },
                data: { imagePath: finalPublicUrl }
            });

            await AuditLogger.logAction(request, session.userId, {
                action: "UPDATE",
                module: "Persons",
                targetId: id,
                newData: { imagePath: finalPublicUrl }
            });

            return p;
        });

        return NextResponse.json({
            success: true,
            imagePath: finalPublicUrl
        });

    } catch (error: any) {
        console.error("Error in person image upload:", error);
        return NextResponse.json({ error: error.message || "Error al procesar la imagen" }, { status: 500 });
    }
}
