import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { loginSchema } from '@/lib/validations/auth.schema';
import { getClientIp } from '@/lib/utils/request';
import { getSecurityConfig } from '@/lib/config/settings';

export async function POST(request: NextRequest) {
    try {
        const ipAddress = getClientIp(request);
        const body = await request.json();
        const validation = loginSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { email, password } = validation.data;

        // Obtener configuración de seguridad
        const security = await getSecurityConfig();
        const { policies, messages } = security;

        // Buscar usuario
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        if (!user || !user.passwordHash) {
            // Registro de access log para usuario no encontrado (omitido aquí para brevedad pero recomendado en prod)
            return NextResponse.json(
                { error: 'Email o contraseña incorrectos' },
                { status: 401 }
            );
        }

        // 1. Verificar si la cuenta está bloqueada por tiempo
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const timeLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
            const msg = messages.lockout.locked
                .replace('{{minutes}}', timeLeft.toString());

            return NextResponse.json(
                {
                    error: msg,
                    code: 'ACCOUNT_LOCKED',
                    lockedUntil: user.lockedUntil
                },
                { status: 403 }
            );
        }

        // 2. Verificar si la cuenta está de desactivada
        if (!user.isActive || user.isDeactivated) {
            return NextResponse.json(
                { error: 'Cuenta inactiva o deshabilitada' },
                { status: 403 }
            );
        }

        // 3. Verificar contraseña
        const passwordMatch = await verifyPassword(password, user.passwordHash);

        if (!passwordMatch) {
            const currentFailed = user.failedLoginAttempts + 1;
            const maxAttempts = policies.account_lockout.max_failed_attempts;
            const shouldLock = currentFailed >= maxAttempts;
            const lockoutMinutes = policies.account_lockout.lockout_duration_minutes;

            // Actualizar intentos del usuario
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: currentFailed,
                    lockedUntil: shouldLock ? new Date(Date.now() + lockoutMinutes * 60 * 1000) : null,
                },
            });

            if (shouldLock) {
                return NextResponse.json({
                    error: messages.lockout.locked.replace('{{minutes}}', lockoutMinutes.toString()),
                    code: 'ACCOUNT_LOCKED_NOW'
                }, { status: 401 });
            }

            // Si lleva 3 o más intentos, mostrar warning
            if (currentFailed >= 3) {
                const warningMsg = messages.lockout.warning
                    .replace('{{current}}', currentFailed.toString())
                    .replace('{{max}}', maxAttempts.toString());

                return NextResponse.json({
                    error: warningMsg,
                    code: 'LOCKOUT_WARNING',
                    attempts: currentFailed
                }, { status: 401 });
            }

            return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
        }

        // 4. Verificar Límite de Sesiones (Solo si el login fue correcto)
        const activeSessions = await prisma.session.count({
            where: { userId: user.id, expiresAt: { gt: new Date() } }
        });

        if (activeSessions >= policies.session.max_concurrent_sessions) {
            // Opcional: Obtener lista de sesiones para que el usuario elija cuál cerrar
            const sessionsList = await prisma.session.findMany({
                where: { userId: user.id, expiresAt: { gt: new Date() } },
                select: { id: true, ipAddress: true, userAgent: true, lastActivityAt: true },
                orderBy: { lastActivityAt: 'desc' }
            });

            const limitMsg = messages.session_limit.message
                .replace('{{current}}', activeSessions.toString())
                .replace('{{max}}', policies.session.max_concurrent_sessions.toString());

            return NextResponse.json({
                error: limitMsg,
                code: 'SESSION_LIMIT_REACHED',
                sessions: sessionsList
            }, { status: 403 });
        }

        // Login exitoso - resetear intentos fallidos
        await prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
                lastLoginIp: ipAddress,
            },
        });

        // Crear sesión
        const session = await createSession(
            user.id,
            ipAddress,
            request.headers.get('user-agent') || null
        );

        const response = NextResponse.json({
            success: true,
            user: session.user,
            mustChangePassword: user.mustChangePassword,
        });

        setSessionCookie(response, session.token);

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Error al procesar la solicitud' },
            { status: 500 }
        );
    }
}
