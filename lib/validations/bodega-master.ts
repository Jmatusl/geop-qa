import { z } from "zod";

export const bodegaArticleSchema = z.object({
  code: z.string().min(1, "El código es obligatorio").max(50, "Máximo 50 caracteres"),
  name: z.string().min(1, "El nombre es obligatorio").max(255, "Máximo 255 caracteres"),
  description: z.string().max(1000, "Máximo 1000 caracteres").optional().nullable(),
  partNumber: z.string().max(100, "Máximo 100 caracteres").optional().nullable(),
  brand: z.string().max(100, "Máximo 100 caracteres").optional().nullable(),
  model: z.string().max(100, "Máximo 100 caracteres").optional().nullable(),
  internalCode: z.string().max(100, "Máximo 100 caracteres").optional().nullable(),
  articleType: z.string().max(50, "Máximo 50 caracteres").optional().nullable(),
  quality: z.string().max(50, "Máximo 50 caracteres").optional().nullable(),
  isCritical: z.boolean().default(false).optional(),
  unit: z.string().min(1, "La unidad es obligatoria").max(20, "Máximo 20 caracteres"),
  minimumStock: z.coerce.number().min(0, "El stock mínimo no puede ser negativo").default(0),
  imagePath: z.string().max(512, "URL de imagen demasiado larga").optional().nullable(),
  technicalFilePath: z.string().max(512, "URL de ficha técnica demasiado larga").optional().nullable(),
  isActive: z.boolean().default(true).optional(),
});

export const bodegaWarehouseSchema = z.object({
  code: z.string().min(1, "El código es obligatorio").max(30, "Máximo 30 caracteres"),
  name: z.string().min(1, "El nombre es obligatorio").max(120, "Máximo 120 caracteres"),
  description: z.string().max(1000, "Máximo 1000 caracteres").optional().nullable(),
  location: z.string().max(255, "Máximo 255 caracteres").optional().nullable(),
  isActive: z.boolean().default(true).optional(),
});

export const bodegaSimpleMasterSchema = z.object({
  code: z.string().min(1, "El código es obligatorio").max(30, "Máximo 30 caracteres"),
  name: z.string().min(1, "El nombre es obligatorio").max(120, "Máximo 120 caracteres"),
  description: z.string().max(300, "Máximo 300 caracteres").optional().nullable(),
  isActive: z.boolean().default(true).optional(),
});
