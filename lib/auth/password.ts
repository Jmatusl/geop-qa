import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hashear contraseña usando bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verificar contraseña contra un hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Validar complejidad de contraseña basada en políticas de seguridad
 */
export function validatePasswordComplexity(
    password: string,
    policies: {
        min_length: number;
        require_uppercase: boolean;
        require_lowercase: boolean;
        require_number: boolean;
        require_special_char: boolean;
    }
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < policies.min_length) {
        errors.push(`La contraseña debe tener al menos ${policies.min_length} caracteres`);
    }

    if (policies.require_uppercase && !/[A-Z]/.test(password)) {
        errors.push('La contraseña debe contener al menos una letra mayúscula');
    }

    if (policies.require_lowercase && !/[a-z]/.test(password)) {
        errors.push('La contraseña debe contener al menos una letra minúscula');
    }

    if (policies.require_number && !/\d/.test(password)) {
        errors.push('La contraseña debe contener al menos un número');
    }

    if (policies.require_special_char && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('La contraseña debe contener al menos un carácter especial');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
