import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: "insumos_config" } });
    return NextResponse.json({ success: true, data: setting?.value ?? null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Error leyendo configuración" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const defaultDeadlineDays = Number(body.defaultDeadlineDays) || 7;

    const value = { defaultDeadlineDays };

    await prisma.appSetting.upsert({
      where: { key: "insumos_config" },
      create: { key: "insumos_config", value },
      update: { value },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Error guardando configuración" }, { status: 500 });
  }
}
