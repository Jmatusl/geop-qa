/**
 * API Route: Operaciones sobre Unidad Individual
 * Endpoint: /api/v1/units/[id]
 * 
 * Métodos:
 * - GET: Obtener unidad por ID
 * - PUT: Actualizar unidad
 * - DELETE: Eliminar unidad (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth/session';
import { updateUnitSchema } from '@/lib/validations/units';
import { getClientIp } from '@/lib/utils/request';
import { z } from 'zod';

/**
 * GET /api/v1/units/[id]
 * Obtener una unidad por su ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const unit = await prisma.unitMaster.findUnique({
      where: { id },
    });

    if (!unit) {
      return NextResponse.json(
        { error: 'Unidad no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(unit);
  } catch (error) {
    console.error('Error obteniendo unidad:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/units/[id]
 * Actualizar una unidad existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateUnitSchema.parse(body);

    // Verificar que la unidad existe
    const existing = await prisma.unitMaster.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Unidad no encontrada' },
        { status: 404 }
      );
    }

    // Verificar unicidad del código si se está cambiando
    if (validatedData.code && validatedData.code !== existing.code) {
      const duplicateCode = await prisma.unitMaster.findUnique({
        where: { code: validatedData.code },
      });

      if (duplicateCode) {
        return NextResponse.json(
          { error: 'Ya existe una unidad con ese código' },
          { status: 409 }
        );
      }
    }

    // Actualizar unidad
    const unit = await prisma.unitMaster.update({
      where: { id },
      data: validatedData,
    });

    // Auditoría
    await prisma.accessLog.create({
      data: {
        userId: session.user.id,
        eventType: 'unit_updated',
        module: 'unidades',
        ipAddress: getClientIp(request),
        metadata: { 
          description: `Unidad actualizada: ${unit.name} (${unit.code})`,
          before: existing,
          after: unit,
          changes: validatedData,
        },
      },
    });

    return NextResponse.json(unit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error actualizando unidad:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/units/[id]
 * Eliminar unidad (soft delete marcando como inactiva)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que la unidad existe
    const existing = await prisma.unitMaster.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Unidad no encontrada' },
        { status: 404 }
      );
    }

    const usageCount = await prisma.supplyRequestItem.count({
      where: {
        OR: [
          { unit: existing.code },
          { unit: existing.symbol },
        ],
      },
    });

    // Verificar si está en uso
    if (usageCount > 0) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar la unidad porque está en uso en solicitudes existentes',
          detail: `La unidad está asociada a ${usageCount} items de solicitud.`,
        },
        { status: 409 }
      );
    }

    // Soft delete: marcar como inactiva
    const unit = await prisma.unitMaster.update({
      where: { id },
      data: { isActive: false },
    });

    // Auditoría
    await prisma.accessLog.create({
      data: {
        userId: session.user.id,
        eventType: 'unit_deleted',
        module: 'unidades',
        ipAddress: getClientIp(request),
        metadata: { 
          description: `Unidad eliminada: ${unit.name} (${unit.code})`,
          unit: existing,
        },
      },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Unidad marcada como inactiva correctamente',
    });
  } catch (error) {
    console.error('Error eliminando unidad:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
