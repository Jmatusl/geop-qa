import { z } from "zod";

export const personSchema = z.object({
    rut: z.string().min(8, "RUT inválido").max(12),
    firstName: z.string().min(1, "Nombres son obligatorios").max(100),
    lastName: z.string().min(1, "Apellidos son obligatorios").max(100),
    motherLastName: z.string().max(100).optional().nullable(),
    email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
    phone: z.string().max(20).optional().nullable(),
    address: z.string().max(255).optional().nullable(),
    imagePath: z.string().optional().nullable(),


    // Opcionales
    nationality: z.string().max(50).optional().nullable(),
    birthDate: z.string().datetime({ offset: true }).optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato fecha inválido")).or(z.date()),
    // Acepta ISO string completo, YYYY-MM-DD o Date object

    civilStatus: z.string().max(20).optional().nullable(),
    shoeSize: z.string().max(10).optional().nullable(),
    shirtSize: z.string().max(10).optional().nullable(),
    pantsSize: z.string().max(10).optional().nullable(),

    emergencyContactName: z.string().max(100).optional().nullable(),
    emergencyContactPhone: z.string().max(20).optional().nullable(),

    bankName: z.string().max(50).optional().nullable(),
    accountType: z.string().max(20).optional().nullable(),
    accountNumber: z.string().max(50).optional().nullable(),

    isActive: z.boolean().default(true).optional(),
});

export const createPersonSchema = personSchema;

export const assignJobPositionSchema = z.object({
    jobPositionId: z.string().uuid("ID de cargo inválido"),
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).or(z.date()),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).or(z.date()).optional().nullable(),
});

export const assignAreaSchema = z.object({
    areaId: z.string().uuid("ID de área inválido"),
});

export const assignWorkGroupSchema = z.object({
    workGroupId: z.string().uuid("ID de grupo inválido"),
});

export const assignSupervisorSchema = z.object({
    supervisorId: z.string().uuid("ID de supervisor inválido"),
});
