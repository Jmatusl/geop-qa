/**
 * API: Detalle de Solicitud de Insumos
 * Archivo: app/api/v1/supply-requests/[id]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { supplyRequestService } from '@/lib/services/supply/supply-request-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const request = await supplyRequestService.getById(id);

    if (!request) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error('Error en GET /api/v1/supply-requests/[id]:', error);
    return NextResponse.json({ error: 'Error al obtener solicitud' }, { status: 500 });
  }
}
