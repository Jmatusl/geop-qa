import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Helper para calcular fechas relativas
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const mockWorkers = [
  { name: "Dario Cardenas Guarda" },
  { name: "Sergio Oyarzo Riffo" },
  { name: "Pamela Fierro Rivera" },
  { name: "Rodrigo Cuevas Guajardo" },
  { name: "Boris Galindo Gallardo" },
  { name: "Marina Veronica Garcia Henriquez" },
  { name: "Catalina Cardemil Albornoz" },
  { name: "Javiera Muñoz Riveros" },
  { name: "Daniela Rios Haro" },
  { name: "Carolina Rubilar Vergara" },
  { name: "Maria Fernanda Calderon Nuñez" },
];

export async function seedMockWorkers(prisma: PrismaClient, roles: Record<string, any>, catalog: any) {
  console.log("👷 Sembrando trabajadores de prueba (Mock) con estados de certificación variados...");

  const passwordHash = await bcrypt.hash("password123", 10);
  const today = new Date();

  for (let i = 0; i < mockWorkers.length; i++) {
    const scenario = mockWorkers[i];
    const fullName = scenario.name;
    const names = fullName.split(" ");
    const firstName = names[0] + (names.length > 3 ? " " + names[1] : "");
    const lastName = names[names.length - 2] + " " + names[names.length - 1];
    const rutBase = 15000000 + i * 1000;
    const rut = `${rutBase}-${i}`;

    // Asignar cargo y grupo aleatorio
    const randomJob = catalog.jobPositions[i % catalog.jobPositions.length].code;
    const randomGroup = catalog.workGroups[i % catalog.workGroups.length].code;

    // 1. Crear Usuario
    const user = await prisma.user.create({
      data: {
        email: `trabajador${i + 1}@sotex.cl`,
        passwordHash,
        firstName,
        lastName,
        rut,
        isActive: true,
        mustChangePassword: false,
      },
    });

    await prisma.userRole.create({
      data: { userId: user.id, roleId: roles["USUARIO"].id },
    });

    // 2. Crear Ficha de Personal
    const person = await prisma.person.create({
      data: {
        rut,
        firstName,
        lastName,
        email: user.email,
        nationality: "Chilena",
        isActive: true,
        jobPositions: {
          create: {
            jobPosition: { connect: { code: randomJob } },
            startDate: new Date(),
          },
        },
        workGroups: {
          create: { workGroup: { connect: { code: randomGroup } } },
        },
      },
    });

    // 3. Vincular usuario a persona
    await prisma.user.update({
      where: { id: user.id },
      data: { personId: person.id },
    });

    console.log(`   ✓ Trabajador ${firstName} ${lastName} creado`);
  }

  console.log(`   ✓ Trabajadores mock creados exitosamente`);
}
