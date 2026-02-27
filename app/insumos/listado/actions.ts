"use server";

import { verifySession } from "@/lib/auth/session";
import { supplyRequestService } from "@/lib/services/supply/supply-request-service";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type ActionResult<T = any> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * Genera una solicitud de prueba con 5 productos para testing
 */
export async function crearSolicitudPrueba(): Promise<
  ActionResult<{ id: string; folio: string }>
> {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "No autorizado" };
  }

  try {
    // Obtener datos maestros activos
    const [categories, units, installations] = await Promise.all([
      prisma.mntSupplyCategory.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        take: 5,
      }),
      prisma.unitMaster.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, code: true, name: true },
        take: 5,
      }),
      prisma.mntInstallation.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        take: 1,
      }),
    ]);

    if (categories.length === 0 || units.length === 0 || installations.length === 0) {
      return {
        success: false,
        error: "Faltan datos maestros (categorías, unidades o instalaciones)",
      };
    }

    // Datos de prueba para 5 productos
    const testProducts = [
      {
        itemName: "Filtro de Aceite Mahle OC-1234",
        categoryId: categories[0]?.id || categories[0].id,
        quantity: 10,
        unit: units[0]?.code || "UNI",
        urgencyLevel: "NORMAL" as const,
        specifications: "Compatible con motores diesel Euro 5",
        estimatedPrice: 8500,
        observations: "Mantención preventiva de flota de camiones",
      },
      {
        itemName: "Correa Serpentina Gates K060900",
        categoryId: categories[1]?.id || categories[0].id,
        quantity: 5,
        unit: units[1]?.code || "UNI",
        urgencyLevel: "ALTA" as const,
        specifications: "Para motor 6 cilindros",
        estimatedPrice: 15000,
        observations: "Reemplazo urgente por desgaste crítico",
      },
      {
        itemName: "Bujía NGK BKR6E",
        categoryId: categories[2]?.id || categories[0].id,
        quantity: 24,
        unit: units[2]?.code || "UNI",
        urgencyLevel: "BAJA" as const,
        specifications: "Gap 1.0mm, resistencia 5k ohm",
        estimatedPrice: 3200,
        observations: "Stock para mantenciones programadas",
      },
      {
        itemName: "Aceite Mobil Delvac 1 15W-40",
        categoryId: categories[3]?.id || categories[0].id,
        quantity: 20,
        unit: units[3]?.code || "LT",
        urgencyLevel: "NORMAL" as const,
        specifications: "Aceite mineral para motores diesel pesados",
        estimatedPrice: 12000,
        observations: "Reposición de stock mensual",
      },
      {
        itemName: "Refrigerante Castrol Radicool SF",
        categoryId: categories[4]?.id || categories[0].id,
        quantity: 15,
        unit: units[4]?.code || "LT",
        urgencyLevel: "NORMAL" as const,
        specifications: "Refrigerante sin silicatos, diluido 50/50",
        estimatedPrice: 6500,
        observations: "Cambio de temporada, preparación invierno",
      },
    ];

    // Calcular fecha de entrega (7 días desde hoy)
    const fechaEntrega = new Date();
    fechaEntrega.setDate(fechaEntrega.getDate() + 7);

    // Crear solicitud con service layer
    const newRequest = await supplyRequestService.create(
      {
        title: "Solicitud de Insumos de Prueba - Testing de Sistema",
        description: "🧪 SOLICITUD DE PRUEBA - Generada automáticamente para testing",
        installationId: installations[0].id,
        requestedDate: fechaEntrega,
        priority: "NORMAL" as const,
        justification: "Solicitud generada para pruebas de funcionalidad de cotizaciones y aprobaciones",
        observations: "Esta solicitud contiene 5 productos de ejemplo para probar funcionalidades de cotización y aprobación.",
        items: testProducts,
      },
      session.user.id
    );

    // Revalidar rutas
    revalidatePath("/insumos");
    revalidatePath("/insumos/listado");

    return {
      success: true,
      data: {
        id: newRequest.id,
        folio: newRequest.folio,
      },
    };
  } catch (error: any) {
    console.error("❌ Error al crear solicitud de prueba:", error);
    return {
      success: false,
      error: error.message || "Error al crear solicitud de prueba",
    };
  }
}

/**
 * Limpia todos los datos transaccionales del módulo de insumos
 * (solicitudes, cotizaciones, items, timeline, etc.)
 * SIN eliminar tablas maestras (estados, categorías, proveedores, etc.)
 */
export async function limpiarDatosModulo(): Promise<ActionResult> {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "No autorizado" };
  }

  // Verificar que el usuario tenga permisos de administrador
  const hasAdminRole = session.user.roles.includes("ADMIN") || session.user.roles.includes("SUPERADMIN");
  if (!hasAdminRole) {
    return { 
      success: false, 
      error: "Solo administradores pueden ejecutar esta acción" 
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      console.log("🧹 Limpiando datos del módulo de insumos...");

      // 1. Eliminar cotizaciones (items de cotización primero por FK)
      await tx.supplyQuotationItem.deleteMany({});
      console.log("  ✓ Eliminados items de cotización");

      await tx.supplyQuotation.deleteMany({});
      console.log("  ✓ Eliminadas cotizaciones");

      // 2. Eliminar items de solicitud
      await tx.supplyRequestItem.deleteMany({});
      console.log("  ✓ Eliminados items de solicitud");

      // 3. Eliminar timeline de solicitudes
      await tx.supplyRequestTimeline.deleteMany({});
      console.log("  ✓ Eliminado historial (timeline)");

      // 4. Eliminar solicitudes
      await tx.supplyRequest.deleteMany({});
      console.log("  ✓ Eliminadas solicitudes");

      console.log("✨ Limpieza completada exitosamente");
    });

    // Revalidar rutas relacionadas
    revalidatePath("/insumos");
    revalidatePath("/insumos/listado");

    return {
      success: true,
      data: {
        message: "Datos del módulo limpiados exitosamente",
      },
    };
  } catch (error: any) {
    console.error("❌ Error al limpiar datos del módulo:", error);
    return {
      success: false,
      error: error.message || "Error al limpiar los datos",
    };
  }
}

/**
 * Obtiene el detalle de items de una solicitud con información de cotizaciones
 */
export async function getRequestItemsDetail(requestId: string) {
  const session = await verifySession();
  if (!session) {
    return null;
  }

  try {
    const items = await prisma.supplyRequestItem.findMany({
      where: { requestId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        quotationItems: {
          include: {
            quotation: {
              select: {
                id: true,
                folio: true,
                statusCode: true,
                supplier: {
                  select: {
                    id: true,
                    legalName: true,
                    fantasyName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    const request = await prisma.supplyRequest.findUnique({
      where: { id: requestId },
      select: {
        folio: true,
        title: true,
        priority: true,
      },
    });

    return {
      folio: request?.folio || "-",
      title: request?.title || "Sin título",
      priority: request?.priority || "NORMAL",
      items: items.map((item: any) => ({
        id: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        statusCode: item.statusCode,
        categoryName: item.category?.name || "-",
        quotations: item.quotationItems.map((qi: any) => ({
          id: qi.quotation.id,
          folio: qi.quotation.folio,
          statusCode: qi.quotation.statusCode,
          supplierName: qi.quotation.supplier?.fantasyName || qi.quotation.supplier?.legalName || "Sin proveedor",
          unitPrice: qi.unitPrice,
          subtotal: qi.subtotal,
        })),
      })),
    };
  } catch (error) {
    console.error("Error al obtener detalle de items:", error);
    return null;
  }
}
