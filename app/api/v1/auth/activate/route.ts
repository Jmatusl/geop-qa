import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyActivationToken, markActivationTokenAsUsed } from '@/lib/auth/tokens';
import { hashPassword } from '@/lib/auth/password';
import { activateAccountSchema } from '@/lib/validations/auth.schema';

import { getClientIp } from '@/lib/utils/request';

export async function POST(request: NextRequest) {
    try {
        const ipAddress = getClientIp(request);
        const body = await request.json();
        const validation = activateAccountSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { token, password } = validation.data;

        // Verificar token
        const userId = await verifyActivationToken(token);

        if (!userId) {
            return NextResponse.json(
                { error: 'Token inválido o expirado' },
                { status: 400 }
            );
        }

        // Hash de contraseña
        const passwordHash = await hashPassword(password);

        // Actualizar usuario
        await prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                emailVerifiedAt: new Date(),
                isActive: true,
                mustChangePassword: false, // User is setting it now
                failedLoginAttempts: 0,
                lockedUntil: null
            },
        });

        // Marcar token como usado
        await markActivationTokenAsUsed(token);

        // Registrar evento
        await prisma.accessLog.create({
            data: {
                userId,
                eventType: 'account_activated',
                module: 'auth',
                endpoint: '/api/v1/auth/activate',
                httpMethod: 'POST',
                statusCode: 200,
                ipAddress,
                userAgent: request.headers.get('user-agent') || null,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Cuenta activada exitosamente',
        });
    } catch (error) {
        console.error('Activate account error:', error);
        return NextResponse.json(
            { error: 'Error al activar cuenta' },
            { status: 500 }
        );
    }
}
