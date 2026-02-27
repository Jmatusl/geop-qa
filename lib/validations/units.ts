/**
 * Validaciones: Mantenedor de Unidades de Medida
 * Archivo: lib/validations/units.ts
 * 
 * Esquemas Zod para validación de entrada en el CRUD de Unidades
 */

import { z } from 'zod';

// Categorías permitidas de unidades
export const unitCategories = ['mass', 'volume', 'length', 'quantity', 'time', 'area'] as const;

/**
 * Esquema base para unidad de medida
 */
export const unitBaseSchema = z.object({
  code: z
    .string()
    .min(1, 'El código es requerido')
    .max(10, 'El código no puede superar 10 caracteres')
    .toUpperCase()
    .regex(/^[A-Z0-9_]+$/, 'El código solo puede contener letras mayúsculas, números y guiones bajos'),
  
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede superar 100 caracteres')
    .trim(),
  
  symbol: z
    .string()
    .min(1, 'El símbolo es requerido')
    .max(10, 'El símbolo no puede superar 10 caracteres')
    .trim(),
  
  category: z.enum(unitCategories, {
    errorMap: () => ({ message: 'Categoría inválida' }),
  }),
  
  description: z
    .string()
    .max(500, 'La descripción no puede superar 500 caracteres')
    .trim()
    .nullable()
    .optional(),
  
  conversionFactor: z
    .number()
    .positive('El factor de conversión debe ser positivo')
    .nullable()
    .optional(),
  
  baseUnit: z
    .string()
    .max(10, 'La unidad base no puede superar 10 caracteres')
    .toUpperCase()
    .nullable()
    .optional(),
  
  isActive: z.boolean().optional().default(true),
});

/**
 * Esquema para crear unidad
 */
export const createUnitSchema = unitBaseSchema;

/**
 * Esquema para actualizar unidad
 */
export const updateUnitSchema = unitBaseSchema.partial().required({ code: true });

/**
 * Tipo inferido para el formulario de unidades
 */
export type UnitFormData = z.infer<typeof createUnitSchema>;

/**
 * Esquema para búsqueda/filtros
 */
export const unitFiltersSchema = z.object({
  search: z.string().trim().optional(),
  category: z.enum(unitCategories).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

// Tipos derivados
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type UnitFilters = z.infer<typeof unitFiltersSchema>;

/**
 * Etiquetas en español para categorías
 */
export const unitCategoryLabels: Record<typeof unitCategories[number], string> = {
  mass: 'Masa',
  volume: 'Volumen',
  length: 'Longitud',
  quantity: 'Cantidad',
  time: 'Tiempo',
  area: 'Área',
};
