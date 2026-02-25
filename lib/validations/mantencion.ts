import { z } from "zod";

export const mntProductionAreaSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  description: z.string().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const mntFarmingCenterSchema = z.object({
  id: z.string().uuid().optional(),
  siepCode: z.string().min(2, "El código SIEP es obligatorio").max(50),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  responsibleName: z.string().max(100).optional().nullable(),
  commune: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  ownerCompany: z.string().max(100).optional().nullable(),
  productionAreaId: z.string().uuid("Debe seleccionar un área de producción").optional().nullable(),
  productionCycle: z.string().max(50).optional().nullable(),
  description: z.string().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const mntInstallationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  folio: z.string().max(50).optional().nullable(),
  internalCode: z.string().max(50).optional().nullable(),
  installationType: z.string().max(50).optional().nullable(),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  farmingCenterId: z.string().uuid("Debe seleccionar un centro de cultivo").optional().nullable(),
  description: z.string().max(255).optional().nullable(),
  observations: z.string().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const mntAreaSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  description: z.string().max(255).optional().nullable(),
  signatureId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const mntSystemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  areaId: z.string().uuid("Debe seleccionar un área"),
  description: z.string().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const mntEquipmentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(150),
  brand: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  partNumber: z.string().max(100).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
  areaId: z.string().uuid("Seleccione un área"),
  systemId: z.string().uuid("Seleccione un sistema"),
  technicalComments: z.string().optional().nullable(),
  prevInstructions: z.string().optional().nullable(),
  estimatedLife: z.string().max(50).optional().nullable(),
  commissioningDate: z.date().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  imageDescription: z.string().max(200).optional().nullable(),
  datasheetUrl: z.string().optional().nullable(),
  datasheetName: z.string().max(200).optional().nullable(),
  referencePrice: z.number().optional().nullable(),
  responsibleIds: z.array(z.string().uuid()).optional().default([]),
  installationId: z.string().uuid("Seleccione una instalación").optional().nullable(),
  isActive: z.boolean().default(true),
});

export const mntActivityLocationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(150),
  commune: z.string().max(100).optional().nullable(),
  isEnabled: z.boolean().default(true),
});

export const mntJobPositionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const mntApplicantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(150),
  email: z.string().email("Correo electrónico inválido").optional().or(z.literal("")),
  jobPositionId: z.string().uuid().optional().nullable().or(z.literal("")),
  signatureUrl: z.string().url().optional().nullable().or(z.literal("")),
  installationIds: z.array(z.string().uuid()).default([]),
  userId: z.string().uuid().optional().nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const mntTechnicalResponsibleSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid("Seleccione un usuario"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(150),
  areaId: z.string().uuid("Seleccione un área"),
  isActive: z.boolean().default(true),
});

export const mntSupplierSchema = z.object({
  id: z.string().uuid().optional(),
  rut: z.string().min(8, "RUT inválido").max(12),
  businessLine: z.string().min(2, "Giro es requerido").max(150),
  legalName: z.string().min(2, "Razón Social es requerida").max(150).optional().nullable(),
  fantasyName: z.string().max(150).optional().nullable(),
  contactName: z.string().max(150).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  contactEmail: z.string().email("Correo inválido").optional().nullable().or(z.literal("")),
  activityEmails: z.array(z.string().email("Correo inválido")).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
});
