/**
 * API Route: Instalaciones
 * Archivo: app/api/v1/installations/route.ts
 * 
 * GET /api/v1/installations - Listar instalaciones
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
});

/**
 * GET /api/v1/installations
 * Lista todas las instalaciones
 */
export async function GET(request: NextRequest) {
  try {
    // Parsear query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const params = querySchema.parse(searchParams);

    // Construir filtros
    const where: any = {};
    if (params.isActive) {
      where.isActive = params.isActive === 'true';
    }

    // Obtener instalaciones
    const installations = await prisma.mntInstallation.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      data: installations,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error obteniendo instalaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
