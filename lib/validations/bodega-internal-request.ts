/**
 * Validaciones: Solicitudes Internas de Bodega
 * Archivo: lib/validations/bodega-internal-request.ts
 */

import { z } from "zod";

export const bodegaInternalRequestItemSchema = z.object({
  articleId: z.string().uuid("Debe seleccionar un artículo válido"),
  quantity: z.coerce.number({ required_error: "La cantidad es requerida", invalid_type_error: "Ingrese un número válido" }).positive("La cantidad debe ser mayor a 0"),
  observations: z.string().max(500, "Las observaciones no pueden superar 500 caracteres").trim().optional().nullable(),
});

export const createBodegaInternalRequestSchema = z.object({
  warehouseId: z.string().uuid("Debe seleccionar una bodega válida"),
  title: z.string().min(5, "El título debe tener al menos 5 caracteres").max(255, "El título no puede superar 255 caracteres").trim(),
  description: z.string().max(1000, "La descripción no puede superar 1000 caracteres").trim().optional().nullable(),
  priority: z.enum(["BAJA", "NORMAL", "ALTA", "URGENTE"]).default("NORMAL"),
  requiredDate: z
    .preprocess(
      (val) => {
        if (val === null || val === undefined || val === "") return undefined;
        return val instanceof Date ? val : new Date(val as string);
      },
      z.date({ invalid_type_error: "Fecha requerida inválida" }).optional(),
    )
    .optional(),
  observations: z.string().max(1000, "Las observaciones no pueden superar 1000 caracteres").trim().optional().nullable(),
  items: z.array(bodegaInternalRequestItemSchema).min(1, "Debe ingresar al menos un artículo").max(200),
});

export const updateBodegaInternalRequestSchema = z.object({
  warehouseId: z.string().uuid("Debe seleccionar una bodega válida"),
  title: z.string().min(5, "El título debe tener al menos 5 caracteres").max(255, "El título no puede superar 255 caracteres").trim(),
  description: z.string().max(1000, "La descripción no puede superar 1000 caracteres").trim().optional().nullable(),
  priority: z.enum(["BAJA", "NORMAL", "ALTA", "URGENTE"]).default("NORMAL"),
  requiredDate: z
    .preprocess(
      (val) => {
        if (val === null || val === undefined || val === "") return undefined;
        return val instanceof Date ? val : new Date(val as string);
      },
      z.date({ invalid_type_error: "Fecha requerida inválida" }).optional(),
    )
    .optional(),
  observations: z.string().max(1000, "Las observaciones no pueden superar 1000 caracteres").trim().optional().nullable(),
  items: z.array(bodegaInternalRequestItemSchema).min(1, "Debe ingresar al menos un artículo").max(200),
});

export const bodegaInternalRequestFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  statusCode: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
  priority: z.enum(["BAJA", "NORMAL", "ALTA", "URGENTE"]).optional(),
  requestedBy: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(["createdAt", "requiredDate", "folio", "priority"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type CreateBodegaInternalRequestInput = z.infer<typeof createBodegaInternalRequestSchema>;
export type UpdateBodegaInternalRequestInput = z.infer<typeof updateBodegaInternalRequestSchema>;
export type BodegaInternalRequestFilters = z.infer<typeof bodegaInternalRequestFiltersSchema>;
