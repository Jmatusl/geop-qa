/**
 * API: Listado de Solicitudes de Insumos
 * Archivo: app/api/v1/supply-requests/route.ts
 * 
 * Endpoint para listar solicitudes con filtros y paginación
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { supplyRequestService } from '@/lib/services/supply/supply-request-service';
import { z } from 'zod';

/**
 * Schema de validación para query params
 */
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.string().optional(),
  installationId: z.string().uuid().optional(),
  priority: z.enum(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']).optional(),
  createdBy: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  requester: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión
    const session = await verifySession();
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Parsear y validar query params
    const { searchParams } = new URL(request.url);
    const queryObject = Object.fromEntries(searchParams.entries());

    const validatedParams = listQuerySchema.parse(queryObject);

    // Convertir fechas de string a Date
    const filters = {
      ...validatedParams,
      startDate: validatedParams.startDate ? new Date(validatedParams.startDate) : undefined,
      endDate: validatedParams.endDate ? new Date(validatedParams.endDate) : undefined,
    };

    // Obtener datos del servicio
    const result = await supplyRequestService.list(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en GET /api/v1/supply-requests:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al obtener solicitudes' },
      { status: 500 }
    );
  }
}
