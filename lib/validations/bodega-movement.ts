import { z } from "zod";

export const bodegaMovementTypeEnum = z.enum([
  "INGRESO",
  "SALIDA",
  "AJUSTE",
  "RESERVA",
  "LIBERACION",
]);

export const createBodegaMovementSchema = z.object({
  movementType: bodegaMovementTypeEnum,
  warehouseId: z.string().uuid("Bodega inválida"),
  articleId: z.string().uuid("Artículo inválido"),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor que cero"),
  reason: z.string().trim().max(500).optional().nullable(),
  observations: z.string().trim().max(2000).optional().nullable(),
});

export type CreateBodegaMovementInput = z.infer<typeof createBodegaMovementSchema>;