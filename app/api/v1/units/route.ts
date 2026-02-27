/**
 * API Route: Mantenedor de Unidades de Medida
 * Endpoint: /api/v1/units
 * 
 * Métodos:
 * - GET: Listar unidades con filtros y paginación
 * - POST: Crear nueva unidad
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth/session';
import { createUnitSchema, unitFiltersSchema } from '@/lib/validations/units';
import { getClientIp } from '@/lib/utils/request';
import { z } from 'zod';

/**
 * GET /api/v1/units
 * Obtener listado de unidades con filtros opcionales
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const filters = unitFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
    });

    // Construir filtros Prisma
    const where: any = {};
    
    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { symbol: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    if (filters.category) {
      where.category = filters.category;
    }
    
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Paginación
    const skip = (filters.page - 1) * filters.pageSize;

    // Ejecutar queries
    const [units, total] = await Promise.all([
      prisma.unitMaster.findMany({
        where,
        orderBy: [
          { category: 'asc' },
          { name: 'asc' },
        ],
        skip,
        take: filters.pageSize,
      }),
      prisma.unitMaster.count({ where }),
    ]);

    return NextResponse.json({
      data: units,
      meta: {
        total,
        page: filters.page,
        limit: filters.pageSize,
        totalPages: Math.ceil(total / filters.pageSize),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error obteniendo unidades:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/units
 * Crear nueva unidad de medida
 */
export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createUnitSchema.parse(body);

    // Verificar unicidad del código
    const existing = await prisma.unitMaster.findUnique({
      where: { code: validatedData.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una unidad con ese código' },
        { status: 409 }
      );
    }

    // Crear unidad
    const unit = await prisma.unitMaster.create({
      data: validatedData,
    });

    // Auditoría
    await prisma.accessLog.create({
      data: {
        userId: session.user.id,
        eventType: 'unit_created',
        module: 'unidades',
        ipAddress: getClientIp(request),
        metadata: { 
          description: `Unidad creada: ${unit.name} (${unit.code})`,
          unit,
        },
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creando unidad:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
