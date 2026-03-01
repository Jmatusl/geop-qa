import { z } from "zod";

export const createBodegaLotSchema = z.object({
  code: z.string().trim().min(1, "Código de lote requerido").max(80),
  warehouseId: z.string().uuid("Bodega inválida"),
  articleId: z.string().uuid("Artículo inválido"),
  initialQuantity: z.coerce.number().positive("La cantidad inicial debe ser mayor que cero"),
  currentQuantity: z.coerce.number().nonnegative().optional(),
  unitCost: z.coerce.number().nonnegative().optional().nullable(),
  manufactureDate: z.coerce.date().optional().nullable(),
  expirationDate: z.coerce.date().optional().nullable(),
  provider: z.string().trim().max(255).optional().nullable(),
  invoiceNumber: z.string().trim().max(100).optional().nullable(),
  status: z.enum(["ACTIVO", "VENCIDO", "AGOTADO", "RETIRADO"]).optional(),
  observations: z.string().trim().max(2000).optional().nullable(),
});

export const createBodegaSerialNumberSchema = z.object({
  lotId: z.string().uuid("Lote inválido"),
  serialNumber: z.string().trim().min(1, "Número de serie requerido").max(120),
  status: z.enum(["DISPONIBLE", "RESERVADO", "ENTREGADO", "BAJA"]).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type CreateBodegaLotInput = z.infer<typeof createBodegaLotSchema>;
export type CreateBodegaSerialNumberInput = z.infer<typeof createBodegaSerialNumberSchema>;
