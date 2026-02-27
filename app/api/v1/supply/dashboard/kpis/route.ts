/**
 * API Route: KPIs del Dashboard de Insumos
 * Archivo: app/api/v1/supply/dashboard/kpis/route.ts
 * 
 * GET /api/v1/supply/dashboard/kpis - Obtener métricas del dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { supplyDashboardService } from '@/lib/services/supply/supply-dashboard-service';

/**
 * GET /api/v1/supply/dashboard/kpis
 * Obtiene los KPIs del dashboard de insumos
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

    // Obtener KPIs
    const kpis = await supplyDashboardService.getKPIs(session.user.id);

    return NextResponse.json({
      data: kpis,
    });
  } catch (error) {
    console.error('Error obteniendo KPIs del dashboard:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
