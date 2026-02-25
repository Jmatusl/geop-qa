import { z } from "zod";

// --- Esquema base para una Actividad embebida en el formulario ---
export const actividadEmbebidaSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3, "El nombre es obligatorio (mín. 3 caracteres)").max(200),
  // `activityTypeId` removed from UI validation — managed server-side when needed
  description: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  locationId: z.string().uuid().optional().or(z.literal("")),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(),
  statusActivity: z.string().default("PENDIENTE"),
  statusId: z.string().uuid().optional().or(z.literal("")),
  responsibleUserId: z.string().uuid().optional().or(z.literal("")),
  supplierId: z.string().uuid().optional().or(z.literal("")),
  estimatedValue: z.coerce.number().optional().default(0),
  observations: z.string().max(2000).optional(),
});

export type ActividadEmbebidaData = z.infer<typeof actividadEmbebidaSchema>;

// --- Esquema principal para crear un Requerimiento ---
export const crearRequerimientoSchema = z.object({
  title: z.string().max(200).optional(),
  masterActivityNameId: z.string().uuid().optional().or(z.literal("")),
  masterActivityNameText: z.string().optional(),
  // `activityTypeId` removed from UI validation: the system will assign a default
  // activity type server-side when none is provided.
  priorityId: z.string().uuid("Seleccione una prioridad válida"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres").max(5000),
  locationId: z.string().uuid().optional().or(z.literal("")),
  areaId: z.string().uuid().optional().or(z.literal("")),
  shipId: z.string().uuid().optional().or(z.literal("")),
  estimatedDate: z.string().optional(), // ISO date string
  estimatedTime: z.string().optional(), // "HH:mm"
  applicantUserId: z.string().uuid().optional().or(z.literal("")),
  nombreSolicitante: z.string().max(150).optional(),
  responsibleUserId: z.string().uuid().optional().or(z.literal("")),
  estimatedValue: z.coerce.number().optional().default(0),
  // Actividades embebidas (opcional, 0..N)
  actividades: z.array(actividadEmbebidaSchema).default([]),
  // IDs de usuario a notificar
  notifyUserIds: z.array(z.string().uuid()).default([]),
});

export type CrearRequerimientoData = z.infer<typeof crearRequerimientoSchema>;

// --- Esquema para adjuntos ---
export const adjuntoSchema = z.object({
  storagePath: z.string(),
  publicUrl: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

export type AdjuntoData = z.infer<typeof adjuntoSchema>;

// --- Esquema para actualizar un requerimiento ---
export const actualizarRequerimientoSchema = crearRequerimientoSchema.partial().extend({
  adjuntos: z.array(adjuntoSchema).optional(),
  activityAttachments: z.record(z.string(), z.array(adjuntoSchema)).optional(), // Adjuntos por actividad (índice → array)
});

export type ActualizarRequerimientoData = z.infer<typeof actualizarRequerimientoSchema>;

// --- Esquema para cambiar estado ---
export const cambiarEstadoSchema = z.object({
  statusId: z.string().uuid("Seleccione un estado válido"),
  comment: z.string().max(1000).optional(),
  responsibleUserId: z.string().uuid().optional().or(z.literal("")),
});

export type CambiarEstadoData = z.infer<typeof cambiarEstadoSchema>;

// --- Esquema para agregar comentario ---
export const agregarComentarioSchema = z.object({
  comment: z.string().min(1, "El comentario no puede estar vacío").max(2000),
});

export type AgregarComentarioData = z.infer<typeof agregarComentarioSchema>;

// --- Esquema para asignar responsable ---
export const asignarResponsableSchema = z.object({
  responsibleUserId: z.string().uuid("Seleccione un responsable válido"),
  comment: z.string().max(500).optional(),
});

export type AsignarResponsableData = z.infer<typeof asignarResponsableSchema>;

// --- Esquema para el Maestro de Actividades ---
export const masterActivitySchema = z.object({
  name: z.string().min(3, "El nombre es obligatorio (mín. 3 caracteres)").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  defaultAreaId: z.string().uuid().optional().or(z.literal("")),
  defaultApplicantUserId: z.string().uuid().optional().or(z.literal("")),
  defaultDescription: z.string().max(5000).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type MasterActivityData = z.infer<typeof masterActivitySchema>;

// --- Esquema para Solicitante ---
export const solicitanteSchema = z.object({
  firstName: z.string().min(2, "El nombre es obligatorio").max(100),
  lastName: z.string().min(2, "El apellido es obligatorio").max(100),
  email: z.string().email("Debe ser un email válido").max(255),
});

export type SolicitanteData = z.infer<typeof solicitanteSchema>;
