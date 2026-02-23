import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
    try {
        const session = await verifySession();

        if (!session) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        return NextResponse.json({
            user: session.user,
        });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { error: 'Error al obtener usuario' },
            { status: 500 }
        );
    }
}
