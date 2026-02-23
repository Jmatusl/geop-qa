import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

export async function seedMantencionMock(prisma: PrismaClient) {
  console.log("🛠️  Iniciando carga de Mock Data de Mantenimiento...");

  const jsonPath = path.join(process.cwd(), "docs/modulos/mantencion-data-manteiners.json");
  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(rawData);

  // Mappings to track JSON ID -> UUID
  const idMaps = {
    cargos: new Map<number, string>(),
    instalaciones: new Map<number, string>(),
    areas: new Map<number, string>(),
    sistemas: new Map<number, string>(),
    equipos: new Map<number, string>(),
  };

  // 1. Cargos (MntJobPosition)
  console.log("   - Cargando Cargos...");
  for (const cargo of data.cargos) {
    const created = await prisma.mntJobPosition.create({
      data: {
        name: cargo.name,
        description: cargo.description || "",
        isActive: cargo.state !== false,
      },
    });
    idMaps.cargos.set(cargo.id, created.id);
  }

  // 2. Instalaciones (MntInstallation)
  console.log("   - Cargando Instalaciones...");
  for (const inst of data.instalaciones) {
    const created = await prisma.mntInstallation.create({
      data: {
        name: inst.name,
        folio: inst.folio_id,
        internalCode: inst.codeInstallation,
        description: inst.description,
        observations: inst.observations,
        isActive: inst.state !== false,
      },
    });
    idMaps.instalaciones.set(inst.id, created.id);
  }
  console.log(`   ✓ Map de instalaciones cargado con ${idMaps.instalaciones.size} entradas.`);

  // 3. Áreas (MntArea)
  console.log("   - Cargando Áreas...");
  for (const area of data.areas) {
    const created = await prisma.mntArea.create({
      data: {
        name: area.name,
        description: area.description || "",
        isActive: area.enable !== false,
      },
    });
    idMaps.areas.set(area.id, created.id);
  }

  // 4. Sistemas (MntSystem)
  console.log("   - Cargando Sistemas...");
  for (const sistema of data.sistemas) {
    const areaUuid = idMaps.areas.get(sistema.areaId);
    if (!areaUuid) continue;

    const created = await prisma.mntSystem.create({
      data: {
        areaId: areaUuid,
        name: sistema.name,
        description: sistema.description || "",
        isActive: sistema.enable !== false,
      },
    });
    idMaps.sistemas.set(sistema.id, created.id);
  }

  // 5. Equipos (MntEquipment)
  console.log("   - Cargando Equipos...");
  for (const equipo of data.equipos) {
    // Buscar sistemaUuid. En el JSON a veces es area/subarea names o IDs.
    let systemUuid: string | undefined;

    // Si tiene subareaId en el JSON
    if (equipo.subareaId && idMaps.sistemas.has(equipo.subareaId)) {
      systemUuid = idMaps.sistemas.get(equipo.subareaId);
    } else {
      // Intento match por nombre de sistema y área
      const area = await prisma.mntArea.findFirst({
        where: { name: equipo.area },
      });
      if (area) {
        const system = await prisma.mntSystem.findFirst({
          where: { areaId: area.id, name: equipo.subarea },
        });
        systemUuid = system?.id;
      }
    }

    if (!systemUuid) {
      // Fallback: Si no tiene sistema, creamos uno genérico "General" en el área especificada
      const area = await prisma.mntArea.findFirst({ where: { name: equipo.area } });
      if (area) {
        const system = await prisma.mntSystem.upsert({
          where: { id: "00000000-0000-0000-0000-000000000000" }, // Dummy to force find or create logic
          update: {},
          create: {
            name: equipo.subarea || "General",
            areaId: area.id,
          },
        });
        systemUuid = system.id;
      } else {
        continue; // No area found, skip
      }
    }

    const instUuid = idMaps.instalaciones.get(equipo.shipId);

    await prisma.mntEquipment.create({
      data: {
        name: equipo.name,
        brand: equipo.brand,
        model: equipo.model,
        serialNumber: equipo.series,
        systemId: systemUuid!,
        areaId: (await prisma.mntSystem.findUnique({ where: { id: systemUuid! } }))?.areaId || "",
        technicalComments: equipo.extra,
        estimatedLife: equipo.vidaUtil?.toString(),
        installationId: instUuid || null,
        isActive: equipo.active !== false,
      },
    });
  }
  const totalEquips = await prisma.mntEquipment.count();
  const linkedEquips = await prisma.mntEquipment.count({ where: { installationId: { not: null } } });
  console.log(`   ✓ Equipos cargados: ${totalEquips} (Vinculados a instalación: ${linkedEquips})`);

  // 6. Solicitantes (MntApplicant)
  console.log("   - Cargando Solicitantes...");
  for (const sol of data.solicitantes) {
    const instUuid = idMaps.instalaciones.get(sol.shipId);
    const cargoUuid = idMaps.cargos.get(sol.cargoid);

    if (!instUuid) {
      console.log(`⚠️  Saltando solicitante "${sol.name}" por falta de instalación válida (shipId: ${sol.shipId})`);
      continue;
    }

    await prisma.mntApplicant.create({
      data: {
        name: sol.name,
        email: sol.email || null,
        jobPositionId: cargoUuid || null,
        isActive: true,
        installations: {
          connect: [{ id: instUuid }],
        },
      },
    });
  }

  // 7. Proveedores (MntSupplier)
  console.log("   - Cargando Proveedores...");
  for (const prov of data.proveedores) {
    await prisma.mntSupplier.create({
      data: {
        rut: prov.rutProveedor,
        businessLine: prov.giro || "S/G",
        legalName: prov.razonSocial,
        fantasyName: prov.nombreFantasia,
        contactName: prov.nombreContacto,
        phone: prov.telefono,
        contactEmail: prov.email,
        activityEmails: prov.emailActividades ? prov.emailActividades.emails || [] : [],
        address: prov.direccion,
        isActive: true,
      },
    });
  }

  // 8. Requerimientos de Mantención (Mock)
  console.log("   - Creando Requerimientos de Mantención Mock...");
  const admin = await prisma.user.findFirst({ where: { email: "desarrollo@sotex.cl" } });
  if (admin) {
    const equipments = await prisma.mntEquipment.findMany({
      where: { installationId: { not: null } },
      take: 5,
    });
    const applicants = await prisma.mntApplicant.findMany({ take: 5 });
    const rqType = await prisma.mntRequestType.findFirst();
    const rqStatus = await prisma.mntRequestStatus.findFirst({ where: { name: "Pendiente" } });

    if (equipments.length > 0 && applicants.length > 0 && rqType && rqStatus) {
      for (let i = 0; i < 5; i++) {
        const equipment = equipments[i % equipments.length];
        const applicant = applicants[i % applicants.length];

        const rq = await prisma.mntRequest.create({
          data: {
            installationId: equipment.installationId!,
            equipmentId: equipment.id,
            typeId: rqType.id,
            statusId: rqStatus.id,
            applicantId: applicant.id,
            description: `Requerimiento de prueba #${i + 6} (Global): Falla detectada en ${equipment.name}`,
            createdById: admin.id,
          },
        });

        await prisma.mntRequestTimeline.create({
          data: {
            requestId: rq.id,
            changedById: admin.id,
            action: "CREACIÓN",
            newStatusId: rqStatus.id,
            comment: "Requerimiento ingresado por el semillero global.",
          },
        });
      }
      console.log(`   ✓ 5 Requerimientos globales creados exitosamente`);
    }
  }

  console.log("✅ Mock Data de Mantenimiento cargada exitosamente.");
}
