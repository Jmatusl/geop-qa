import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { validateMenuAccess } from "@/lib/auth/access";

/**
 * Ruta API para validar acceso al menú para la sesión actual.
 * Usado por proxy.ts (Edge) para verificar permisos.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ hasAccess: false, error: "No session" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const path = searchParams.get("path");

        if (!path) {
            return NextResponse.json({ hasAccess: false, error: "Path is required" }, { status: 400 });
        }

        const hasAccess = await validateMenuAccess(session.userId, path);

        return NextResponse.json({ hasAccess });
    } catch (error) {
        console.error("Error in access validation API:", error);
        return NextResponse.json({ hasAccess: false, error: "Internal error" }, { status: 500 });
    }
}
