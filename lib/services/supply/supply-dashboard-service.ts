/**
 * Servicio: Dashboard de Solicitud de Insumos
 * Archivo: lib/services/supply/supply-dashboard-service.ts
 * 
 * Lógica de negocio para el dashboard del módulo de insumos
 */

import { prisma } from '@/lib/prisma';

/**
 * Interface para KPIs del dashboard
 */
export interface SupplyDashboardKPIs {
  // Métricas de solicitudes
  totalRequests: number;
  pendingRequests: number;
  inProcessRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  finalizedRequests: number;
  
  // Métricas de items
  totalItems: number;
  pendingItems: number;
  quotedItems: number;
  authorizedItems: number;
  deliveredItems: number;
  
  // Métricas de cotizaciones
  totalQuotations: number;
  sentQuotations: number;
  receivedQuotations: number;
  approvedQuotations: number;
  
  // Métricas financieras
  totalEstimatedValue: number;
  totalQuotedValue: number;
  
  // Métricas del mes actual
  requestsThisMonth: number;
  finalizedThisMonth: number;
  valueThisMonth: number;
}

/**
 * Interface para solicitud reciente (tabla)
 */
export interface RecentSupplyRequest {
  id: string;
  folio: string;
  title: string;
  requestedBy: {
    id: string;
    name: string;
  };
  installation: {
    id: string;
    name: string;
  };
  status: string;
  createdAt: Date;
  itemsCount: number;
  estimatedValue: number;
}

export class SupplyDashboardService {
  private readonly prisma = prisma;

  /**
   * Obtiene todos los KPIs del dashboard
   */
  async getKPIs(userId?: string): Promise<SupplyDashboardKPIs> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Queries paralelas para mejor performance
    const [
      // Estados de solicitudes
      requestStatusCounts,
      totalRequests,
      requestsThisMonth,
      finalizedThisMonth,
      
      // Estados de items
      itemStatusCounts,
      totalItems,
      
      // Estados de cotizaciones
      quotationStatusCounts,
      totalQuotations,
      
      // Valores financieros
      totalEstimatedValue,
      totalQuotedValue,
      valueThisMonth,
    ] = await Promise.all([
      // Conteo por estado de solicitudes
      this.prisma.supplyRequest.groupBy({
        by: ['statusCode'],
        _count: true,
      }),
      
      // Total de solicitudes
      this.prisma.supplyRequest.count(),
      
      // Solicitudes del mes
      this.prisma.supplyRequest.count({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      
      // Finalizadas este mes
      this.prisma.supplyRequest.count({
        where: {
          statusCode: 'FINALIZADA',
          updatedAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      
      // Conteo por estado de items
      this.prisma.supplyRequestItem.groupBy({
        by: ['statusCode'],
        _count: true,
      }),
      
      // Total de items
      this.prisma.supplyRequestItem.count(),
      
      // Conteo por estado de cotizaciones
      this.prisma.supplyQuotation.groupBy({
        by: ['statusCode'],
        _count: true,
      }),
      
      // Total de cotizaciones
      this.prisma.supplyQuotation.count(),
      
      // Suma de valores estimados
      this.prisma.supplyRequest.aggregate({
        _sum: { estimatedValue: true },
        where: {
          statusCode: { notIn: ['ANULADA', 'RECHAZADA'] },
        },
      }),
      
      // Suma de valores cotizados
      this.prisma.supplyQuotation.aggregate({
        _sum: { totalAmount: true },
        where: {
          statusCode: { notIn: ['RECHAZADA', 'ANULADA'] },
        },
      }),
      
      // Valor de solicitudes del mes
      this.prisma.supplyRequest.aggregate({
        _sum: { estimatedValue: true },
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
    ]);

    // Mapear conteos de solicitudes por estado
    const requestCounts = {
      PENDIENTE: 0,
      EN_PROCESO: 0,
      APROBADA: 0,
      RECHAZADA: 0,
      FINALIZADA: 0,
      ANULADA: 0,
    };
    requestStatusCounts.forEach((item) => {
      requestCounts[item.statusCode as keyof typeof requestCounts] = item._count;
    });

    // Mapear conteos de items por estado
    const itemCounts = {
      PENDIENTE: 0,
      COTIZADO: 0,
      AUTORIZADO: 0,
      ENTREGADO: 0,
      NO_DISPONIBLE: 0,
      ANULADO: 0,
      RECHAZADO: 0,
    };
    itemStatusCounts.forEach((item) => {
      itemCounts[item.statusCode as keyof typeof itemCounts] = item._count;
    });

    // Mapear conteos de cotizaciones por estado
    const quotationCounts = {
      PENDIENTE: 0,
      ENVIADA: 0,
      RECIBIDA: 0,
      APROBADA: 0,
      RECHAZADA: 0,
      ANULADA: 0,
    };
    quotationStatusCounts.forEach((item) => {
      quotationCounts[item.statusCode as keyof typeof quotationCounts] = item._count;
    });

    return {
      // Métricas de solicitudes
      totalRequests,
      pendingRequests: requestCounts.PENDIENTE,
      inProcessRequests: requestCounts.EN_PROCESO,
      approvedRequests: requestCounts.APROBADA,
      rejectedRequests: requestCounts.RECHAZADA,
      finalizedRequests: requestCounts.FINALIZADA,
      
      // Métricas de items
      totalItems,
      pendingItems: itemCounts.PENDIENTE,
      quotedItems: itemCounts.COTIZADO,
      authorizedItems: itemCounts.AUTORIZADO,
      deliveredItems: itemCounts.ENTREGADO,
      
      // Métricas de cotizaciones
      totalQuotations,
      sentQuotations: quotationCounts.ENVIADA,
      receivedQuotations: quotationCounts.RECIBIDA,
      approvedQuotations: quotationCounts.APROBADA,
      
      // Métricas financieras
      totalEstimatedValue: totalEstimatedValue._sum.estimatedValue?.toNumber() || 0,
      totalQuotedValue: totalQuotedValue._sum.totalAmount || 0,
      
      // Métricas del mes actual
      requestsThisMonth,
      finalizedThisMonth,
      valueThisMonth: valueThisMonth._sum.estimatedValue?.toNumber() || 0,
    };
  }

  /**
   * Obtiene las solicitudes más recientes para la tabla del dashboard
   */
  async getRecentRequests(limit: number = 10): Promise<RecentSupplyRequest[]> {
    const requests = await this.prisma.supplyRequest.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true },
        },
        installation: {
          select: { id: true, name: true },
        },
        items: {
          select: { id: true },
        },
      },
    });

    return requests.map((req) => ({
      id: req.id,
      folio: req.folio,
      title: req.title,
      requestedBy: {
        id: req.creator.id,
        name: `${req.creator.firstName} ${req.creator.lastName}`,
      },
      installation: req.installation,
      status: req.statusCode,
      createdAt: req.createdAt,
      itemsCount: req.items.length,
      estimatedValue: req.estimatedValue.toNumber(),
    }));
  }

  /**
   * Obtiene solicitudes que requieren atención según permisos del usuario
   * (PENDIENTE para aprobadores, EN_PROCESO para cotizadores)
   */
  async getRequestsRequiringAttention(
    userId: string,
    userPermissions: string[]
  ): Promise<RecentSupplyRequest[]> {
    void userId;
    // Determinar qué estados ver según permisos
    const statusFilter: string[] = [];
    
    if (userPermissions.includes('aprobar')) {
      statusFilter.push('PENDIENTE');
    }
    
    if (
      userPermissions.includes('gestionar_cotizaciones') ||
      userPermissions.includes('gestiona_cotizaciones')
    ) {
      statusFilter.push('EN_PROCESO');
    }

    if (statusFilter.length === 0) return [];

    const requests = await this.prisma.supplyRequest.findMany({
      where: {
        statusCode: { in: statusFilter },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true },
        },
        installation: {
          select: { id: true, name: true },
        },
        items: {
          select: { id: true },
        },
      },
    });

    return requests.map((req) => ({
      id: req.id,
      folio: req.folio,
      title: req.title,
      requestedBy: {
        id: req.creator.id,
        name: `${req.creator.firstName} ${req.creator.lastName}`,
      },
      installation: req.installation,
      status: req.statusCode,
      createdAt: req.createdAt,
      itemsCount: req.items.length,
      estimatedValue: req.estimatedValue.toNumber(),
    }));
  }
}

export const supplyDashboardService = new SupplyDashboardService();
