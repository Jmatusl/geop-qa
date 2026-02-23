import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePasswordResetToken } from '@/lib/auth/tokens';
import { sendPasswordResetEmail } from '@/lib/email/client';
import { recoverPasswordSchema } from '@/lib/validations/auth.schema';

import { getClientIp } from '@/lib/utils/request';

export async function POST(request: NextRequest) {
    try {
        const ipAddress = getClientIp(request);
        const body = await request.json();
        const validation = recoverPasswordSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { email } = validation.data;

        // Buscar usuario
        const user = await prisma.user.findUnique({
            where: { email },
        });

        // Por seguridad, siempre retornar éxito aunque el email no exista
        if (!user) {
            return NextResponse.json({
                success: true,
                message: 'Si el email existe, recibirás un enlace de recuperación',
            });
        }

        // Verificar que la cuenta esté activa
        if (!user.isActive || user.isDeactivated) {
            return NextResponse.json({
                success: true,
                message: 'Si el email existe, recibirás un enlace de recuperación',
            });
        }

        // Generar token de reset
        const token = await generatePasswordResetToken(user.id);

        // Enviar email
        await sendPasswordResetEmail(email, token, user.firstName);

        // Registrar evento
        await prisma.accessLog.create({
            data: {
                userId: user.id,
                eventType: 'password_reset_requested',
                module: 'auth',
                endpoint: '/api/v1/auth/recover',
                httpMethod: 'POST',
                statusCode: 200,
                ipAddress,
                userAgent: request.headers.get('user-agent') || null,
                metadata: {
                    email,
                },
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Si el email existe, recibirás un enlace de recuperación',
        });
    } catch (error) {
        console.error('Recover password error:', error);
        return NextResponse.json(
            { error: 'Error al procesar la solicitud' },
            { status: 500 }
        );
    }
}
