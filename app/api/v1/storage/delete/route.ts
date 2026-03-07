import { NextRequest, NextResponse } from "next/server";
import { deleteFile } from "@/lib/storage/r2";
import { verifySession } from "@/lib/auth/session";

/**
 * API ROUTE - DELETE FILE FROM STORAGE (R2)
 *
 * Verifies session and deletes the specified key from the S3/R2 bucket.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Falta la clave del archivo" }, { status: 400 });
    }

    // Prevención básica: no permitir borrar fuera de las carpetas permitidas si se quisiera escalar
    // Por ahora, borramos lo que nos pidan que sea del sistema
    await deleteFile(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file from storage:", error);
    return NextResponse.json({ error: "Error interno al borrar el archivo" }, { status: 500 });
  }
}
