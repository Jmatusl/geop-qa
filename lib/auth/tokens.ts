import { prisma } from '@/lib/prisma';

/**
 * Get accurate expiration config from database or default
 */
async function getExpirationConfig() {
    try {
        const setting = await prisma.appSetting.findUnique({
            where: { key: 'EXPIRATION_CONFIG' },
        });

        const config = (setting?.value as any) || {};
        return {
            activation_token_days: config.activation_token_days || 7,
            password_reset_token_hours: config.password_reset_token_hours || 24,
        };
    } catch {
        return {
            activation_token_days: 7,
            password_reset_token_hours: 24,
        };
    }
}

/**
 * Generate a password reset token
 */
export async function generatePasswordResetToken(userId: string): Promise<string> {
    const token = crypto.randomUUID();
    const config = await getExpirationConfig();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.password_reset_token_hours);

    await prisma.passwordResetToken.create({
        data: {
            userId,
            token,
            expiresAt,
        },
    });

    return token;
}

/**
 * Verify a password reset token
 */
export async function verifyPasswordResetToken(token: string): Promise<string | null> {
    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
        return null;
    }

    return resetToken.userId;
}

/**
 * Mark password reset token as used
 */
export async function markPasswordResetTokenAsUsed(token: string): Promise<void> {
    await prisma.passwordResetToken.update({
        where: { token },
        data: { usedAt: new Date() },
    });
}

/**
 * Generate an activation token
 */
export async function generateActivationToken(userId: string): Promise<string> {
    const token = crypto.randomUUID();
    const config = await getExpirationConfig();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.activation_token_days);

    await prisma.activationToken.create({
        data: {
            userId,
            token,
            expiresAt,
        },
    });

    return token;
}

/**
 * Verify an activation token
 */
export async function verifyActivationToken(token: string): Promise<string | null> {
    const activationToken = await prisma.activationToken.findUnique({
        where: { token },
    });

    if (!activationToken || activationToken.usedAt || activationToken.expiresAt < new Date()) {
        return null;
    }

    return activationToken.userId;
}

/**
 * Mark activation token as used
 */
export async function markActivationTokenAsUsed(token: string): Promise<void> {
    await prisma.activationToken.update({
        where: { token },
        data: { usedAt: new Date() },
    });
}

