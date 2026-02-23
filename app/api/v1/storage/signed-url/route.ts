
import { NextRequest, NextResponse } from "next/server";
import { getSignedDownloadUrl } from "@/lib/storage/r2";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const key = searchParams.get("key");

        if (!key) {
            return NextResponse.json({ error: "Key query parameter is required" }, { status: 400 });
        }

        // Fetch duration from DB config
        let expiresIn = 3600; // Default
        try {
            const setting = await prisma.appSetting.findUnique({ where: { key: "STORAGE_CONFIG" } });
            if (setting?.value && (setting.value as any).signed_url_expiration_seconds) {
                expiresIn = parseInt((setting.value as any).signed_url_expiration_seconds);
            }
        } catch (e) {
            console.warn("Could not load signed_url_expiration_seconds from DB, using default.", e);
        }

        const url = await getSignedDownloadUrl(key, expiresIn);

        if (searchParams.get("redirect") === "true") {
            return NextResponse.redirect(url);
        }

        return NextResponse.json({ url, expiresIn }, { status: 200 });

    } catch (error) {
        console.error("Error generating signed URL:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
