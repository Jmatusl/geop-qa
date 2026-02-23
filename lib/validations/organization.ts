import { z } from "zod";

export const jobPositionSchema = z.object({
    code: z.string().min(1, "El código es obligatorio").max(50, "Máximo 50 caracteres"),
    name: z.string().min(1, "El nombre es obligatorio").max(100, "Máximo 100 caracteres"),
    isActive: z.boolean().default(true).optional(),
});

export const areaSchema = z.object({
    code: z.string().min(1, "El código es obligatorio").max(50, "Máximo 50 caracteres"),
    name: z.string().min(1, "El nombre es obligatorio").max(100, "Máximo 100 caracteres"),
    isActive: z.boolean().default(true).optional(),
});

export const workGroupSchema = z.object({
    code: z.string().min(1, "El código es obligatorio").max(50, "Máximo 50 caracteres"),
    name: z.string().min(1, "El nombre es obligatorio").max(100, "Máximo 100 caracteres"),
    isActive: z.boolean().default(true).optional(),
});
