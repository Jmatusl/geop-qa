import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || "1");
    const pageSize = Number(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";

    const where = search
      ? {
          OR: [
            { requestItem: { request: { folio: { contains: search, mode: "insensitive" as const } } } },
            { article: { code: { contains: search, mode: "insensitive" as const } } },
            { article: { name: { contains: search, mode: "insensitive" as const } } },
            { warehouse: { code: { contains: search, mode: "insensitive" as const } } },
            { warehouse: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.bodegaReservation.findMany({
        where,
        include: {
          article: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          requestItem: {
            select: {
              request: {
                select: {
                  id: true,
                  folio: true,
                  statusCode: true,
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.bodegaReservation.count({ where }),
    ]);

    return NextResponse.json({
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener reservas" }, { status: 500 });
  }
}
