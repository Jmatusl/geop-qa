/**
 * Validaciones: Transacciones de Bodega (Unificado)
 * Archivo: lib/validations/bodega-transaction.ts
 */

import { z } from "zod";

export const bodegaTransactionTypeEnum = z.enum(["INGRESO", "RETIRO", "TRANSFERENCIA", "AJUSTE", "SALIDA", "DEVOLUCION"]);

/**
 * Estados posibles del flujo de transacciones.
 * Unificado para manejar Intenciones (Retiros) y Ejecuciones (Ingresos/Ajustes)
 */
export const bodegaTransactionStatusEnum = z.enum([
  "BORRADOR",      // Guardado por el usuario, no enviado
  "PENDIENTE",     // Esperando aprobación (Solicitudes/Retiros)
  "APROBADA",      // Aprobada, lista para despacho/recepción
  "RECHAZADA",     // No autorizada
  "APLICADA",      // Ejecutada/Aplicada a stock, pero pendiente de verificación (Ingresos/Transferencias)
  "PREPARADA",     // Verificada en bodega, lista para retiro físico (Retiros)
  "EN_TRANSITO",   // Para transferencias entre bodegas
  "COMPLETADO",    // Finalizada exitosamente (Stock afectado y verificado)
  "ANULADA"        // Cancelada después de aprobada o pendiente
]);

export const bodegaTransactionItemSchema = z.object({
  id: z.string().uuid().optional(), // Para actualizaciones
  articleId: z.string().uuid("Debe seleccionar un artículo válido"),
  quantity: z.coerce.number({ required_error: "Requerido", invalid_type_error: "Número inválido" }).positive("Debe ser > 0"),
  unitCost: z.coerce.number().min(0, "No puede ser negativo").optional().nullable(),
  observations: z.string().max(500, "Máximo 500 caracteres").trim().optional().nullable(),
  
  // Para transferencias o movimientos específicos por ítem si fuera necesario
  targetWarehouseId: z.string().uuid().optional().nullable(),
  
  // Trazabilidad: De qué ítem de otra transacción proviene (ej: Retiro proviene de un Ingreso específico)
  sourceTransactionItemId: z.string().uuid().optional().nullable(),
});

export const createBodegaTransactionSchema = z.object({
  type: bodegaTransactionTypeEnum,
  status: bodegaTransactionStatusEnum.default("PENDIENTE"),
  
  // Ubicaciones
  warehouseId: z.string().uuid("Seleccione bodega de origen/principal"),
  targetWarehouseId: z.string().uuid("Seleccione bodega de destino").optional().nullable(),
  
  // Información General
  title: z.string().max(255, "Máximo 255 caracteres").trim().optional().nullable(),
  description: z.string().max(1000, "Máximo 1000 caracteres").trim().optional().nullable(),
  
  // Específicos de Solicitudes (RETIRO)
  priority: z.enum(["BAJA", "NORMAL", "ALTA", "URGENTE"]).default("NORMAL"),
  requiredDate: z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    return val instanceof Date ? val : new Date(val as string);
  }, z.date().optional().nullable()),
  
  // Auditoría y Contexto
  requestedById: z.string().uuid().optional().nullable(),
  responsableName: z.string().max(150, "Máximo 150 caracteres").trim().optional().nullable(),
  externalReference: z.string().max(100, "Máximo 100 caracteres").trim().optional().nullable(),
  quotationNumber: z.string().max(100, "Máximo 100 caracteres").trim().optional().nullable(),
  deliveryGuide: z.string().max(100, "Máximo 100 caracteres").trim().optional().nullable(),
  observations: z.string().max(2000, "Máximo 2000 caracteres").trim().optional().nullable(),
  
  // Items
  items: z.array(bodegaTransactionItemSchema).min(1, "Debe ingresar al menos un artículo"),
  
  // Flags de Procesamiento Automático (Uso interno de Service/API)
  autoApprove: z.boolean().optional().default(false),
  autoComplete: z.boolean().optional().default(false),
  
  // Evidencia Attachments (URLs de archivos ya subidos)
  evidence: z.array(z.string()).optional(),
  
  // Metadatos adicionales (JSON)
  metadata: z.record(z.any()).optional().nullable(),
});

export const updateBodegaTransactionSchema = createBodegaTransactionSchema.partial().extend({
  // Podríamos querer forzar el ID si se pasa en el body, pero usualmente viene en el URL
});

export const bodegaTransactionFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).optional().default(20),
  search: z.string().optional(),
  type: bodegaTransactionTypeEnum.optional(),
  status: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
  requestedBy: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type CreateBodegaTransactionInput = z.infer<typeof createBodegaTransactionSchema>;
export type UpdateBodegaTransactionInput = z.infer<typeof updateBodegaTransactionSchema>;
export type BodegaTransactionFilters = z.infer<typeof bodegaTransactionFiltersSchema>;
export type BodegaTransactionItemInput = z.infer<typeof bodegaTransactionItemSchema>;
