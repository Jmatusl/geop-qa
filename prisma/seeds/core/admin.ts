import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedAdmin(prisma: PrismaClient, adminRoleId: string) {
    console.log('👤 Creando usuario administrador...')

    const passwordHash = await bcrypt.hash('password123', 10)

    // 1. Usuario
    const adminUser = await prisma.user.create({
        data: {
            email: 'desarrollo@sotex.cl',
            passwordHash,
            firstName: 'Desarrollo',
            lastName: 'Sotex',
            rut: '11111111-1',
            phone: '+56900000000',
            emailVerifiedAt: new Date(),
            isActive: true,
            mustChangePassword: false
        }
    })

    await prisma.userRole.create({
        data: {
            userId: adminUser.id,
            roleId: adminRoleId
        }
    })

    // 2. Perfil Personal (Linkeado)
    const adminPerson = await prisma.person.create({
        data: {
            rut: adminUser.rut!,
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            email: adminUser.email,
            phone: adminUser.phone,
            nationality: 'Chilena',
            isActive: true
        }
    })

    await prisma.user.update({
        where: { id: adminUser.id },
        data: { personId: adminPerson.id }
    })

    console.log('   ✓ Admin creado: desarrollo@sotex.cl')
    return adminUser;
}
