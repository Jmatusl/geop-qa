import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPasswordResetToken, markPasswordResetTokenAsUsed } from '@/lib/auth/tokens';
import { hashPassword } from '@/lib/auth/password';
import { resetPasswordSchema } from '@/lib/validations/auth.schema';

import { getClientIp } from '@/lib/utils/request';

export async function POST(request: NextRequest) {
    try {
        const ipAddress = getClientIp(request);
        const body = await request.json();
        const validation = resetPasswordSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { token, password } = validation.data;

        // Verificar token
        const userId = await verifyPasswordResetToken(token);
        if (!userId) {
            return NextResponse.json(
                { error: 'El enlace de recuperación es inválido o ha expirado' },
                { status: 400 }
            );
        }

        // Buscar usuario
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            );
        }

        // Hashear nueva contraseña
        const passwordHash = await hashPassword(password);

        // Actualizar usuario
        // mustChangePassword = false porque el usuario mismo la está estableciendo
        await prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                mustChangePassword: false,
                lockedUntil: null, // Desbloquear si estaba bloqueado
                failedLoginAttempts: 0,
            },
        });

        // Marcar token como usado
        await markPasswordResetTokenAsUsed(token);

        // Invalidar sesiones existentes por seguridad
        await prisma.session.deleteMany({
            where: { userId },
        });

        // Registrar evento
        await prisma.accessLog.create({
            data: {
                userId: user.id,
                eventType: 'password_reset_success',
                module: 'auth',
                endpoint: '/api/v1/auth/reset',
                httpMethod: 'POST',
                statusCode: 200,
                ipAddress,
                userAgent: request.headers.get('user-agent') || null,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Contraseña actualizada correctamente',
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Error al procesar la solicitud' },
            { status: 500 }
        );
    }
}
