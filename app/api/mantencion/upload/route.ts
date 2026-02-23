import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { uploadFile } from "@/lib/storage/r2";

function sanitizeKey(key: string) {
  return key.replace(/[^a-zA-Z0-9-_\.]/g, "_");
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No se encontraron archivos" }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileExt = file.name.split(".").pop();
      const cleanName = sanitizeKey(file.name.replace(`.${fileExt}`, ""));
      const fileName = `mantenimiento/${session.userId}/${Date.now()}_${cleanName}.${fileExt}`;

      await uploadFile(fileName, buffer, file.type);
      uploadedUrls.push(fileName);
    }

    return NextResponse.json({ success: true, urls: uploadedUrls });
  } catch (error: any) {
    console.error("Error uploading to R2:", error);
    return NextResponse.json({ error: "Error interno al subir archivos a R2" }, { status: 500 });
  }
}
