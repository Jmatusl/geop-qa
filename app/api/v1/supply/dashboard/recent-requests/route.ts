/**
 * API Route: Solicitudes Recientes del Dashboard
 * Archivo: app/api/v1/supply/dashboard/recent-requests/route.ts
 * 
 * GET /api/v1/supply/dashboard/recent-requests - Obtener solicitudes recientes
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { supplyDashboardService } from '@/lib/services/supply/supply-dashboard-service';
import { modulePermissionService } from '@/lib/services/permissions/module-permission-service';
import { z } from 'zod';

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
  attention: z.enum(['true', 'false']).optional(),
});

/**
 * GET /api/v1/supply/dashboard/recent-requests
 * Obtiene las solicitudes recientes o que requieren atención
 */
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

    // Parsear query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const params = querySchema.parse(searchParams);

    let requests;

    if (params.attention === 'true') {
      // Obtener solicitudes que requieren atención del usuario
      const userPermissions = await modulePermissionService.getUserPermissions(
        session.user.id,
        'insumos'
      );
      requests = await supplyDashboardService.getRequestsRequiringAttention(
        session.user.id,
        userPermissions
      );
    } else {
      // Obtener solicitudes recientes
      requests = await supplyDashboardService.getRecentRequests(params.limit);
    }

    return NextResponse.json({
      data: requests,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error obteniendo solicitudes recientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
