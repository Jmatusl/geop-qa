import { z } from "zod";

export const bodegaMovementTypeEnum = z.enum(["INGRESO", "SALIDA", "AJUSTE", "RESERVA", "LIBERACION"]);

export const createBodegaMovementSchema = z
  .object({
    movementType: bodegaMovementTypeEnum,
    warehouseId: z.string().uuid("Bodega inválida"),
    // Soportar tanto ítem único (legacy) como múltiples ítems
    articleId: z.string().uuid("Artículo inválido").optional(),
    quantity: z.coerce.number().positive("La cantidad debe ser mayor que cero").optional(),
    unitCost: z.coerce.number().min(0, "El costo no puede ser negativo").optional(),
    items: z
      .array(
        z.object({
          articleId: z.string().uuid("Artículo inválido"),
          quantity: z.coerce.number().positive("La cantidad debe ser mayor que cero"),
          unitCost: z.coerce.number().min(0, "El costo no puede ser negativo").optional(),
          sourceMovementItemId: z.string().uuid().optional(),
        }),
      )
      .optional(),
    reason: z.string().trim().max(500).optional().nullable(),
    observations: z.string().trim().max(2000).optional().nullable(),
    responsable: z.string().trim().max(150).optional().nullable(),
    externalReference: z.string().trim().max(100).optional().nullable(),
    evidence: z.array(z.string()).optional(),
    autoVerify: z.boolean().optional(),
  })
  .refine(
    (data) => {
      return (data.articleId && data.quantity) || (data.items && data.items.length > 0);
    },
    {
      message: "Debe proporcionar al menos un artículo con su cantidad",
    },
  );

export type CreateBodegaMovementInput = z.infer<typeof createBodegaMovementSchema>;
