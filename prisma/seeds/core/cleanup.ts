import { PrismaClient } from "@prisma/client";

export async function cleanup(prisma: PrismaClient) {
  console.log("🧹 Limpiando base de datos (preservando estructura)...");

  // Limpiar Mantención (Operacional y Maestros - excluyendo Config)
  // Hijos e interacciones inmediatos
  await prisma.mntRequestEvidence.deleteMany();
  await prisma.mntRequestTimeline.deleteMany();
  await prisma.mntRequestExpense.deleteMany();
  await prisma.mntRequestIteration.deleteMany();
  await prisma.mntWorkRequirementEvidence.deleteMany();
  await prisma.mntWorkRequirementRelation.deleteMany();
  await prisma.mntEquipmentResponsible.deleteMany();
  await prisma.mntUserNotificationPreference.deleteMany();

  // Entidades principales
  await prisma.mntWorkRequirement.deleteMany();
  await prisma.mntRequest.deleteMany();

  // Catálogos e inventarios dependientes
  await prisma.mntSupplyItem.deleteMany();

  // Maestros base de Configuración
  await prisma.mntWorkRequirementStatus.deleteMany();
  await prisma.mntRequestStatus.deleteMany();
  await prisma.mntRequestType.deleteMany();
  await prisma.mntActivityLocation.deleteMany();
  await prisma.mntSupplyCategory.deleteMany();
  await prisma.mntApplicant.deleteMany();
  await prisma.mntSupplier.deleteMany();
  await prisma.mntJobPosition.deleteMany();
  await prisma.mntTechnicalResponsible.deleteMany();

  // Jerarquía física/lógica
  await prisma.mntEquipment.deleteMany();
  await prisma.mntSystem.deleteMany();
  await prisma.mntInstallation.deleteMany();
  await prisma.mntFarmingCenter.deleteMany();
  await prisma.mntProductionArea.deleteMany();
  await prisma.mntArea.deleteMany();

  // Módulo RH / Personas
  await prisma.personSupervisor.deleteMany();
  await prisma.personJobPosition.deleteMany();
  await prisma.personArea.deleteMany();
  await prisma.personWorkGroup.deleteMany();
  await prisma.person.deleteMany();
  await prisma.workGroup.deleteMany();
  await prisma.area.deleteMany();
  await prisma.jobPosition.deleteMany();

  // Módulo Core / Sistema
  await prisma.accessLog.deleteMany();
  await prisma.appSettingAudit.deleteMany();
  await prisma.menuAudit.deleteMany();
  await prisma.session.deleteMany();
  await prisma.activationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.userIdentity.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.userDeactivationReason.deleteMany();

  console.log("   ✓ Limpieza completada");
}
