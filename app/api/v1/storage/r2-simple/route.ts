import { NextRequest, NextResponse } from "next/server";
import { uploadFile, getStorageConfig } from "@/lib/storage/r2";
import { verifySession } from "@/lib/auth/session";

/**
 * Endpoint simplificado para subida directa de archivos a R2.
 * Utilizado principalmente por módulos de Bodega para evidencias desde móvil.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const path = (formData.get("path") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No se encontró el archivo" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExt = file.name.split(".").pop();
    const timestamp = Date.now();

    // Saneamiento básico del nombre
    const cleanName = file.name
      .replace(`.${fileExt}`, "")
      .replace(/[^a-zA-Z0-9-_\.]/g, "_")
      .toLowerCase();

    const key = `${path}/${timestamp}_${cleanName}.${fileExt}`;

    await uploadFile(key, buffer, file.type);

    // Obtener la configuración para construir la URL pública
    const storageConfig = await getStorageConfig();
    let publicUrl = key;

    if (storageConfig.public_url) {
      // Asegurar que no haya doble slash
      const base = storageConfig.public_url.endsWith("/") ? storageConfig.public_url.slice(0, -1) : storageConfig.public_url;
      publicUrl = `${base}/${key}`;
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      data: {
        key,
        url: publicUrl,
        filename: file.name,
        filesize: file.size,
        filetype: file.type,
      },
    });
  } catch (error: any) {
    console.error("[API] r2-simple upload error:", error);
    return NextResponse.json({ error: "Error interno al subir archivo" }, { status: 500 });
  }
}
