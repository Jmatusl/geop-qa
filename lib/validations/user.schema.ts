import { z } from 'zod';
import { validateRUT } from '@/lib/utils/chile-utils';

export const baseUserSchema = z.object({
    email: z.string().email('Email inválido'),
    rut: z.string().optional().refine((val) => {
        if (!val || val.trim() === '') return true; // Permitir vacío
        return validateRUT(val);
    }, 'RUT inválido'),
    experienceYears: z.number().int().min(0).optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    roleIds: z.array(z.string()).min(1, 'Debe asignar al menos un rol'),
    passwordMode: z.enum(['MANUAL', 'AUTO']).default('AUTO'),
    password: z.string().optional(),
    isGoogleSsoEnabled: z.boolean().default(false),
});

export const userSchema = baseUserSchema.refine((data) => {
    if (data.passwordMode === 'MANUAL' && (!data.password || data.password.length < 8)) {
        return false;
    }
    return true;
}, {
    message: 'La contraseña es requerida en modo manual y debe tener mínimo 8 caracteres',
    path: ['password'],
});

export const updateUserSchema = baseUserSchema.partial().extend({
    id: z.string().uuid(),
    password: z.string().optional(),
});

export const deactivateUserSchema = z.object({
    userId: z.string().uuid(),
    deactivationReasonId: z.string().uuid(),
    deactivationComment: z.string().optional(),
});

export const bulkDeactivateSchema = z.object({
    userIds: z.array(z.string().uuid()).min(1, 'Debe seleccionar al menos un usuario'),
    deactivationReasonId: z.string().uuid(),
    deactivationComment: z.string().optional(),
});

export const resetUserPasswordSchema = z.object({
    userId: z.string().uuid(),
    newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    mustChangePassword: z.boolean().default(false),
});

export type UserInput = z.infer<typeof userSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type DeactivateUserInput = z.infer<typeof deactivateUserSchema>;
export type BulkDeactivateInput = z.infer<typeof bulkDeactivateSchema>;
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;
