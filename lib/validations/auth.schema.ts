import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'La contraseña es requerida'),
});

export const recoverPasswordSchema = z.object({
    email: z.string().email('Email inválido'),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token es requerido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmar contraseña es requerido'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
});

export const activateAccountSchema = z.object({
    token: z.string().min(1, 'Token es requerido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmar contraseña es requerido'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmar contraseña es requerido'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RecoverPasswordInput = z.infer<typeof recoverPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ActivateAccountInput = z.infer<typeof activateAccountSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
