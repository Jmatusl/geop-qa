import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePasswordResetToken } from '@/lib/auth/tokens';
import { sendPasswordResetEmail } from '@/lib/email/client';
import { verifySession } from '@/lib/auth/session';
import { AuditLogger } from '@/lib/audit/logger';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Verificar que el usuario que solicita tiene permisos (admin)
        const session = await verifySession();
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Aquí se podría agregar verificación de roles más específica si es necesario

        const { id } = await params;

        // Buscar al usuario objetivo
        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        if (!user.isActive || user.isDeactivated) {
            return NextResponse.json(
                { error: 'El usuario no está activo o ha sido desactivado' },
                { status: 400 }
            );
        }

        // Generar token de recuperación
        const token = await generatePasswordResetToken(user.id);

        // Construir URL de recuperación (misma lógica que en lib/email/client.ts)
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset/${token}`;

        // Enviar correo
        const emailResult = await sendPasswordResetEmail(user.email, token, user.firstName);

        if (!emailResult.success) {
            throw new Error(emailResult.error || 'Fallo al enviar el correo');
        }

        // Registrar auditoría
        await AuditLogger.log({
            request,
            userId: session.userId,
            eventType: 'PASSWORD_RESET_REQUEST',
            module: 'Users',
            metadata: {
                targetId: user.id,
                triggeredBy: 'ADMIN_MANUAL_ACTION',
                adminId: session.userId,
                resetUrl: resetUrl // Agregar el link al log
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Enlace de recuperación enviado exitosamente al usuario'
        });

    } catch (error: any) {
        console.error('Error sending recovery email manually:', error);
        return NextResponse.json(
            { error: 'Error al enviar el correo de recuperación', details: error.message },
            { status: 500 }
        );
    }
}
