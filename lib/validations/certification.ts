import { z } from "zod";

export const certificationTypeSchema = z.object({
    code: z.string().min(1, "El código es obligatorio").max(50),
    name: z.string().min(1, "El nombre es obligatorio").max(200),
    description: z.string().optional().nullable(),
    validityMonths: z.number().int().positive("Debe ser positivo").optional().nullable(),
    isActive: z.boolean().default(true).optional(),
});

export const workerCertificationDetailSchema = z.object({
    certificationId: z.string().uuid("ID de certificación obligatorio"),
    inscriptionNumber: z.string().max(50).optional().nullable(),
    renewedFromId: z.string().uuid().optional().nullable(),
});

export const workerResolutionSchema = z.object({
    resolutionNumber: z.string().min(1, "Número de resolución obligatorio").max(50),
    issueDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")).or(z.date()),
    validityStartDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")).or(z.date()),
    validityEndDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")).or(z.date()).optional().nullable(),
    durationValue: z.number().optional().nullable(),
    durationUnit: z.string().optional().nullable(), // DAYS, MONTHS, YEARS, PERMANENT
    validationImageUrl: z.string().url("URL de imagen de validación inválida").optional().nullable().or(z.literal("")),
    attachments: z.array(z.string().url()).optional().nullable(),

    certifications: z.array(workerCertificationDetailSchema).min(1, "Debe incluir al menos una certificación"),
});
