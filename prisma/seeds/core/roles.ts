import { PrismaClient } from '@prisma/client';

export async function seedRoles(prisma: PrismaClient) {
    console.log('📋 Creando roles...')

    const roles = [
        { code: 'ADMIN', name: 'Administrador', description: 'Acceso completo al sistema' },
        { code: 'SUPERVISOR', name: 'Supervisor', description: 'Supervisor de personal y certificaciones' },
        { code: 'OPERADOR', name: 'Operador', description: 'Operador con permisos limitados' },
        { code: 'USUARIO', name: 'Usuario', description: 'Usuario básico' },
        { code: 'CLIENTE', name: 'Cliente', description: 'Acceso externo limitado' }
    ]

    const createdRoles: Record<string, any> = {}
    for (const role of roles) {
        createdRoles[role.code] = await prisma.role.create({ data: role })
    }
    console.log('   ✓ Roles creados')
    return createdRoles;
}
