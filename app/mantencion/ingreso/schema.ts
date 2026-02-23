import { z } from "zod";

export const RequerimientoSchema = z.object({
  installationId: z.string().uuid("Seleccione una instalación válida"),
  areaId: z.string().uuid("Seleccione un área válida"),
  systemId: z.string().uuid("Seleccione un sistema válido"),
  equipmentId: z.string().uuid("Seleccione un equipo válido"),
  typeId: z.string().uuid("Seleccione el tipo de falla"),
  applicantId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  evidences: z.array(z.string()).optional(),
});

export type RequerimientoFormData = z.infer<typeof RequerimientoSchema>;
