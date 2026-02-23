const fs = require("fs");
const path = require("path");

const jsonPath = path.join(__dirname, "..", "docs", "modulos", "mantencion-data-manteiners.json");
const outputPath = path.join(__dirname, "..", "prisma", "seed-standalone-mantencion.ts");

const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

// 1. Limpiar Instalaciones
const instalaciones = raw.instalaciones.map((i, idx) => ({
  id: idx + 1, // Correlativo
  name: i.name,
  folio: i.folio_id,
  description: i.description,
  oldId: i.id, // Temporal para mapear
}));

// 2. Limpiar Cargos
const cargos = raw.cargos.map((c, idx) => ({
  id: idx + 1,
  name: c.name,
  oldId: c.id,
}));

// 3. Limpiar Áreas y Sistemas (Jerárquicamente es más limpio)
const areas = raw.areas.map((a, idx) => {
  const areaSystems = raw.sistemas
    .filter((s) => s.areaId === a.id)
    .map((s, sIdx) => ({
      id: (idx + 1) * 100 + (sIdx + 1), // Correlativo compuesto
      name: s.name,
      oldId: s.id,
    }));

  return {
    id: idx + 1,
    name: a.name,
    systems: areaSystems,
    oldId: a.id,
  };
});

// 4. Limpiar Equipos
const equipos = raw.equipos.map((e, idx) => {
  // Encontrar ship por oldId
  const inst = instalaciones.find((i) => i.oldId === e.shipId);
  return {
    name: e.name,
    brand: e.brand,
    model: e.model,
    series: e.series,
    areaName: e.area,
    systemName: e.subarea,
    shipFolio: inst ? inst.folio : null,
    extra: e.extra,
    vidaUtil: e.vidaUtil,
  };
});

// 5. Limpiar Solicitantes
const solicitantes = raw.solicitantes.map((s, idx) => {
  const inst = instalaciones.find((i) => i.oldId === s.installationId);
  const cargo = cargos.find((c) => c.oldId === s.jobPositionId);
  return {
    name: s.name,
    email: s.email,
    shipFolio: inst ? inst.folio : null,
    cargoName: cargo ? cargo.name : null,
  };
});

// 6. Proveedores
const proveedores = raw.proveedores.map((p) => ({
  rut: p.rutProveedor,
  name: p.razonSocial,
  giro: p.giro,
  fantasia: p.nombreFantasia,
  contacto: p.nombreContacto,
  email: p.email,
  telefono: p.telefono,
  direccion: p.direccion,
}));

// Borrar oldIds antes de generar
const cleanData = {
  instalaciones: instalaciones.map(({ oldId, ...rest }) => rest),
  cargos: cargos.map(({ oldId, ...rest }) => rest),
  areas: areas.map(({ oldId, systems, ...rest }) => ({
    ...rest,
    systems: systems.map(({ oldId, ...sRest }) => sRest),
  })),
  equipos,
  solicitantes,
  proveedores,
};

const template = `
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DATA = ${JSON.stringify(cleanData, null, 2)};

async function main() {
  console.log("🚀 Iniciando SEED INDEPENDIENTE (Limpio y Correlativo)...");
  
  try {
    console.log("🧹 Limpiando tablas...");
    await prisma.mntRequestTimeline.deleteMany();
    await prisma.mntRequestEvidence.deleteMany();
    await prisma.mntRequest.deleteMany();
    await prisma.mntEquipmentResponsible.deleteMany();
    await prisma.mntTechnicalResponsible.deleteMany();
    await prisma.mntEquipment.deleteMany();
    await prisma.mntSystem.deleteMany();
    await prisma.mntArea.deleteMany();
    await prisma.mntApplicant.deleteMany();
    await prisma.mntSupplier.deleteMany();
    await prisma.mntJobPosition.deleteMany();
    await prisma.mntInstallation.deleteMany();
    
    // Config base
    console.log("⚙️  Configurando tipos y estados...");
    const types = ["Carena", "Mantención Correctiva", "Mantención Preventiva", "Mantención Programada", "Overhaul", "Solicitud de materiales"];
    for (const name of types) await prisma.mntRequestType.upsert({ where: { name }, update: {}, create: { name } });
    
    const statuses = [
      { name: "Pendiente", colorHex: "#FBBF24" },
      { name: "Aprobado", colorHex: "#3B82F6" },
      { name: "En Proceso", colorHex: "#8B5CF6" },
      { name: "Finalizado", colorHex: "#10B981" },
      { name: "Rechazado", colorHex: "#EF4444" }
    ];
    for (const s of statuses) await prisma.mntRequestStatus.upsert({ where: { name: s.name }, update: {}, create: s });

    console.log("📦 Insertando maestros correlativos...");
    
    // 1. Cargos
    for (const c of DATA.cargos) {
      await prisma.mntJobPosition.create({ data: { name: c.name } });
    }

    // 2. Instalaciones
    for (const i of DATA.instalaciones) {
      await prisma.mntInstallation.create({ data: { name: i.name, folio: i.folio, description: i.description } });
    }

    // 3. Áreas y Sistemas (Jerárquico)
    for (const a of DATA.areas) {
      const area = await prisma.mntArea.create({ data: { name: a.name } });
      for (const s of a.systems) {
        await prisma.mntSystem.create({ data: { name: s.name, areaId: area.id } });
      }
    }

    console.log("🚢 Procesando Equipos (vinculando por nombres)...");
    for (const e of DATA.equipos) {
      const area = await prisma.mntArea.findFirst({ where: { name: e.areaName } });
      if (!area) continue;

      let system = await prisma.mntSystem.findFirst({ where: { name: e.systemName, areaId: area.id } });
      if (!system) {
        system = await prisma.mntSystem.create({ data: { name: e.systemName || "General", areaId: area.id } });
      }

      const inst = await prisma.mntInstallation.findFirst({ where: { folio: e.shipFolio } });

      await prisma.mntEquipment.create({
        data: {
          name: e.name,
          brand: e.brand,
          model: e.model,
          serialNumber: e.series,
          systemId: system.id,
          areaId: area.id,
          installationId: inst?.id || null,
          technicalComments: e.extra,
          estimatedLife: e.vidaUtil?.toString()
        }
      });
    }

    console.log("👥 Insertando Solicitantes...");
    for (const s of DATA.solicitantes) {
      const inst = await prisma.mntInstallation.findFirst({ where: { folio: s.shipFolio } });
      const cargo = s.cargoName ? await prisma.mntJobPosition.findFirst({ where: { name: s.cargoName } }) : null;
      if (inst) {
        await prisma.mntApplicant.create({
          data: {
            name: s.name,
            email: s.email,
            installationId: inst.id,
            jobPositionId: cargo?.id || null
          }
        });
      }
    }

    console.log("🚛 Insertando Proveedores...");
    for (const p of DATA.proveedores) {
      await prisma.mntSupplier.create({
        data: {
          rut: p.rut,
          legalName: p.name,
          businessLine: p.giro || "S/G",
          fantasyName: p.fantasia,
          contactName: p.contacto,
          contactEmail: p.email,
          phone: p.telefono,
          address: p.direccion
        }
      });
    }

    console.log("✅ SEED FINALIZADO EXITOSAMENTE");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
`;

fs.writeFileSync(outputPath, template);
console.log("✅ Generado con éxito: " + outputPath);
