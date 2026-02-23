import { NextRequest, NextResponse } from 'next/server';
import { verifySession, destroySession, clearSessionCookie } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

import { getClientIp } from '@/lib/utils/request';

export async function POST(request: NextRequest) {
    try {
        const ipAddress = getClientIp(request);
        const session = await verifySession();

        if (!session) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        // Registrar logout en AccessLog
        await prisma.accessLog.create({
            data: {
                userId: session.userId,
                eventType: 'logout',
                module: 'auth',
                endpoint: '/api/v1/auth/logout',
                httpMethod: 'POST',
                statusCode: 200,
                ipAddress,
                userAgent: request.headers.get('user-agent') || null,
            },
        });

        // Destruir sesión
        await destroySession(session.token);

        const response = NextResponse.json({ success: true });
        clearSessionCookie(response);

        return response;
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { error: 'Error al cerrar sesión' },
            { status: 500 }
        );
    }
}
