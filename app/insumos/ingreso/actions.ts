/**
 * Server Actions: Ingreso de Solicitud de Insumos
 * Archivo: app/insumos/ingreso/actions.ts
 * 
 * Thin wrappers que delegan al Service Layer
 */

"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/session";
import { supplyRequestService, SupplyRequestBusinessError } from "@/lib/services/supply/supply-request-service";
import {
  createSupplyRequestSchema,
  type CreateSupplyRequestInput,
} from "@/lib/validations/supply-request";
import { z } from "zod";

/**
 * Resultado de una Server Action
 */
type ActionResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

/**
 * Crea una nueva solicitud de insumos
 */
export async function crearSolicitudInsumos(
  formData: CreateSupplyRequestInput
): Promise<ActionResult<{ id: string; folio: string }>> {
  // 1. Verificar sesión
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "No autorizado" };
  }

  try {
    // 2. Validar datos con Zod
    const validatedData = createSupplyRequestSchema.parse(formData);

    // 3. Delegar al servicio
    const result = await supplyRequestService.create(validatedData, session.user.id);

    // 4. Revalidar rutas relacionadas
    revalidatePath("/insumos");
    revalidatePath("/insumos/listado");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error creando solicitud:", error);

    // Errores de validación Zod
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: firstError.message,
        field: firstError.path.join("."),
      };
    }

    // Errores de negocio
    if (error instanceof SupplyRequestBusinessError) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Error genérico
    return {
      success: false,
      error: "Error al crear la solicitud. Intente nuevamente.",
    };
  }
}

/**
 * Genera una solicitud de prueba con 5 productos para testing
 */
export async function crearSolicitudPrueba(): Promise<
  ActionResult<{ id: string; folio: string }>
> {
  // 1. Verificar sesión
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "No autorizado" };
  }

  try {
    // 2. Obtener datos maestros activos
    const { prisma } = await import("@/lib/prisma");
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

    // 3. Datos de prueba para 5 productos
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

    // 4. Calcular fecha de entrega (7 días desde hoy)
    const fechaEntrega = new Date();
    fechaEntrega.setDate(fechaEntrega.getDate() + 7);

    // 5. Crear solicitud con service layer
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

    // 6. Revalidar rutas
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
