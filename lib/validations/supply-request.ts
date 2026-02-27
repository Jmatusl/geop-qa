/**
 * Validaciones: Solicitud de Insumos
 * Archivo: lib/validations/supply-request.ts
 * 
 * Esquemas Zod para validación de solicitudes de insumos
 */

import { z } from 'zod';

/**
 * Esquema para un item individual de la solicitud
 */
export const supplyRequestItemSchema = z.object({
  categoryId: z.string().uuid('Debe seleccionar una categoría'),
  itemName: z
    .string()
    .min(2, 'El nombre del item debe tener al menos 2 caracteres')
    .max(255, 'El nombre no puede superar 255 caracteres')
    .trim(),
  // z.coerce.number() convierte string a number (compatible con inputs tipo texto)
  quantity: z.coerce
    .number({ required_error: 'La cantidad es requerida', invalid_type_error: 'Ingrese un número válido' })
    .positive('La cantidad debe ser mayor a 0'),
  // Unidad de medida (texto libre, default UNI)
  unit: z
    .string()
    .min(1, 'La unidad es requerida')
    .max(50, 'La unidad no puede superar 50 caracteres')
    .trim()
    .default('UNI'),
  specifications: z
    .string()
    .max(500, 'Las especificaciones no pueden superar 500 caracteres')
    .trim()
    .optional()
    .nullable(),
  estimatedPrice: z
    .number()
    .positive('El precio estimado debe ser mayor a 0')
    .optional()
    .nullable(),
  observations: z
    .string()
    .max(500, 'Las observaciones no pueden superar 500 caracteres')
    .trim()
    .optional()
    .nullable(),
  // Nivel de urgencia del ítem (se persiste como prefijo en specifications)
  urgencyLevel: z.enum(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']).default('NORMAL').optional(),
});

/**
 * Esquema para crear una solicitud de insumos
 */
export const createSupplyRequestSchema = z.object({
  title: z
    .string()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(255, 'El título no puede superar 255 caracteres')
    .trim(),
  
  description: z
    .string()
    .max(1000, 'La descripción no puede superar 1000 caracteres')
    .trim()
    .optional()
    .nullable(),
  
  installationId: z.string().uuid('Debe seleccionar una instalación'),
  
  // Acepta tanto string ISO como objeto Date (RHF puede pasar ambos en distintas fases)
  requestedDate: z.preprocess(
    (val) => (val instanceof Date ? val : new Date(val as string)),
    z.date({ required_error: 'La fecha es requerida', invalid_type_error: 'Fecha inválida' })
  ),
  
  priority: z.enum(['BAJA', 'NORMAL', 'ALTA', 'URGENTE'], {
    errorMap: () => ({ message: 'Prioridad inválida' }),
  }).default('NORMAL'),
  
  justification: z
    .string()
    .max(1000, 'La justificación no puede superar 1000 caracteres')
    .trim()
    .optional()
    .nullable(),
  
  observations: z
    .string()
    .max(1000, 'Las observaciones no pueden superar 1000 caracteres')
    .trim()
    .optional()
    .nullable(),
  
  items: z
    .array(supplyRequestItemSchema)
    .min(1, 'Debe agregar al menos un item a la solicitud')
    .max(100, 'No puede agregar más de 100 items por solicitud'),
});

/**
 * Esquema para actualizar una solicitud (antes de aprobar)
 */
export const updateSupplyRequestSchema = createSupplyRequestSchema.partial().extend({
  id: z.string().uuid(),
});

/**
 * Esquema para aprobar/rechazar una solicitud
 */
export const reviewSupplyRequestSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['APROBAR', 'RECHAZAR']),
  observations: z
    .string()
    .max(500, 'Las observaciones no pueden superar 500 caracteres')
    .trim()
    .optional()
    .nullable(),
});

/**
 * Esquema para anular una solicitud
 */
export const cancelSupplyRequestSchema = z.object({
  id: z.string().uuid(),
  reason: z
    .string()
    .min(10, 'Debe proporcionar una razón de al menos 10 caracteres')
    .max(500, 'La razón no puede superar 500 caracteres')
    .trim(),
});

/**
 * Esquema para filtros de búsqueda
 */
export const supplyRequestFiltersSchema = z.object({
  search: z.string().trim().optional(),
  statusCode: z.string().optional(),
  installationId: z.string().uuid().optional(),
  priority: z.enum(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']).optional(),
  createdBy: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

// Tipos derivados
export type SupplyRequestItem = z.infer<typeof supplyRequestItemSchema>;
export type CreateSupplyRequestInput = z.infer<typeof createSupplyRequestSchema>;
export type UpdateSupplyRequestInput = z.infer<typeof updateSupplyRequestSchema>;
export type ReviewSupplyRequestInput = z.infer<typeof reviewSupplyRequestSchema>;
export type CancelSupplyRequestInput = z.infer<typeof cancelSupplyRequestSchema>;
export type SupplyRequestFilters = z.infer<typeof supplyRequestFiltersSchema>;

/**
 * Etiquetas en español para prioridades
 */
export const priorityLabels: Record<string, string> = {
  BAJA: 'Baja',
  NORMAL: 'Normal',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

/**
 * Colores para badges de prioridad
 */
export const priorityVariants = {
  BAJA: 'outline' as const,
  NORMAL: 'default' as const,
  ALTA: 'default' as const,
  URGENTE: 'destructive' as const,
};
