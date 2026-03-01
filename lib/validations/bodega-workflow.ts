import { z } from "zod";

export const bodegaApproveRequestSchema = z.object({
  observations: z.string().max(500).trim().optional().nullable(),
});

export const bodegaRejectRequestSchema = z.object({
  reason: z.string().min(5, "Debe indicar motivo de rechazo").max(500).trim(),
});

export const bodegaPrepareRequestSchema = z.object({
  observations: z.string().max(500).trim().optional().nullable(),
});

export const bodegaDeliverRequestSchema = z.object({
  observations: z.string().max(500).trim().optional().nullable(),
  deliverAll: z.boolean().optional().default(true),
});

export type BodegaApproveRequestInput = z.infer<typeof bodegaApproveRequestSchema>;
export type BodegaRejectRequestInput = z.infer<typeof bodegaRejectRequestSchema>;
export type BodegaPrepareRequestInput = z.infer<typeof bodegaPrepareRequestSchema>;
export type BodegaDeliverRequestInput = z.infer<typeof bodegaDeliverRequestSchema>;
