import { NextRequest, NextResponse } from "next/server";
import { getSignedUploadUrl } from "@/lib/storage/r2";
import { verifySession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { fileName, contentType, folder = "general" } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    // Estructura de carpetas: folder/UUID_filename
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/\s+/g, "_").toLowerCase();
    const key = `${folder}/${timestamp}_${cleanFileName}`;

    const url = await getSignedUploadUrl(key, contentType);

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error("Error generating signed upload URL:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
