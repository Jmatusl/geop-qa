/**
 * Custom Hook Composable - Formulario de Requerimientos
 * 
 * Centraliza toda la lógica de negocio del formulario de requerimientos,
 * incluyendo validaciones, auto-fill, y manejo de estado.
 * 
 * @module useRequirementForm
 */

import { useCallback, useEffect, useMemo } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { crearRequerimientoSchema, type CrearRequerimientoData } from "@/lib/validations/actividades";
import { format } from "date-fns";

interface Catalogs {
  activityTypes: Array<{ id: string; name: string; code: string }>;
  priorities: Array<{ id: string; name: string; colorHex: string; code?: string }>;
  locations: Array<{ id: string; name: string; commune: string | null }>;
  users: Array<{ id: string; firstName: string; lastName: string; email: string }>;
  ships: Array<{ id: string; name: string }>;
  masterActivityNames: Array<{
    id: string;
    name: string;
    description?: string | null;
    defaultAreaId?: string | null;
    defaultApplicantUserId?: string | null;
    defaultDescription?: string | null;
  }>;
  areas: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; fantasyName: string | null; rut: string; legalName: string | null }>;
}

interface UseRequirementFormProps {
  initialData?: any;
  catalogs: Catalogs;
  currentUser: { id: string; firstName: string; lastName: string };
  isEditing?: boolean;
}

/**
 * Hook personalizado para manejar formularios de requerimientos
 */
export function useRequirementForm({
  initialData,
  catalogs,
  currentUser,
  isEditing = false,
}: UseRequirementFormProps) {
  // Computar valores por defecto
  const defaultValues = useMemo(() => {
    const defaultPriorityId =
      catalogs.priorities.find((p) => p.code === "MEDIA")?.id ||
      catalogs.priorities.find((p) => p.name.toLowerCase() === "media")?.id ||
      "";

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const defaultEstimatedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const defaultEstimatedTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    if (initialData) {
      return {
        title: initialData.title || "",
        masterActivityNameId: initialData.masterActivityNameId || "",
        masterActivityNameText: initialData.masterActivityName?.name || initialData.masterActivityNameText || "",
        priorityId: initialData.priorityId || defaultPriorityId,
        description: initialData.description || "",
        locationId: initialData.locationId || "",
        areaId: initialData.areaId || "",
        shipId: initialData.shipId || "",
        estimatedDate: initialData.estimatedDate ? format(new Date(initialData.estimatedDate), "yyyy-MM-dd") : defaultEstimatedDate,
        estimatedTime: initialData.estimatedTime || defaultEstimatedTime,
        applicantUserId: initialData.applicantUserId || currentUser.id,
        nombreSolicitante: initialData.applicant
          ? `${initialData.applicant.firstName} ${initialData.applicant.lastName}`
          : `${currentUser.firstName} ${currentUser.lastName}`,
        responsibleUserId: initialData.responsibleUserId || "",
        estimatedValue: initialData.estimatedValue || 0,
        actividades: initialData.activities?.map((act: any) => ({
          id: act.id,
          name: act.name,
          description: act.description || "",
          locationId: act.locationId || "",
          supplierId: act.supplierId || "",
          startDate: act.plannedStartDate ? format(new Date(act.plannedStartDate), "yyyy-MM-dd") : "",
          endDate: act.plannedEndDate ? format(new Date(act.plannedEndDate), "yyyy-MM-dd") : "",
          estimatedValue: act.estimatedValue || 0,
          statusActivity: act.statusActivity || "PENDIENTE",
        })) || [],
      };
    }

    return {
      title: "",
      masterActivityNameId: "",
      masterActivityNameText: "",
      priorityId: defaultPriorityId,
      description: "",
      locationId: "",
      areaId: "",
      shipId: "",
      estimatedDate: defaultEstimatedDate,
      estimatedTime: defaultEstimatedTime,
      applicantUserId: currentUser.id,
      nombreSolicitante: `${currentUser.firstName} ${currentUser.lastName}`,
      responsibleUserId: "",
      estimatedValue: 0,
      actividades: [],
    };
  }, [initialData, catalogs.priorities, currentUser]);

  // Inicializar formulario
  const methods = useForm<CrearRequerimientoData>({
    resolver: zodResolver(crearRequerimientoSchema),
    defaultValues,
  });

  const { watch, setValue, reset } = methods;

  /**
   * Auto-fill desde Master Activity
   */
  const handleMasterActivitySelect = useCallback(
    (masterId: string) => {
      const master = catalogs.masterActivityNames.find((m) => m.id === masterId);
      if (!master) return;

      setValue("masterActivityNameId", master.id);
      setValue("masterActivityNameText", master.name);
      setValue("title", master.name);

      if (master.defaultDescription) {
        setValue("description", master.defaultDescription);
      }

      if (master.defaultAreaId) {
        setValue("areaId", master.defaultAreaId);
      }

      if (master.defaultApplicantUserId) {
        const user = catalogs.users.find((u) => u.id === master.defaultApplicantUserId);
        if (user) {
          setValue("applicantUserId", user.id);
          setValue("nombreSolicitante", `${user.firstName} ${user.lastName}`);
        }
      }
    },
    [catalogs.masterActivityNames, catalogs.users, setValue]
  );

  /**
   * Seleccionar solicitante
   */
  const handleApplicantSelect = useCallback(
    (userId: string) => {
      const user = catalogs.users.find((u) => u.id === userId);
      if (!user) return;

      setValue("applicantUserId", user.id);
      setValue("nombreSolicitante", `${user.firstName} ${user.lastName}`);
    },
    [catalogs.users, setValue]
  );

  /**
   * Validación de fechas
   */
  const validateDates = useCallback(() => {
    const estimatedDate = watch("estimatedDate");
    const activities = watch("actividades");

    if (!estimatedDate || !activities || activities.length === 0) {
      return true;
    }

    const reqDate = new Date(estimatedDate);

    for (const activity of activities) {
      if (activity.endDate) {
        const actDate = new Date(activity.endDate);
        if (actDate < reqDate) {
          return "La fecha de fin de actividad no puede ser anterior a la fecha estimada del requerimiento";
        }
      }

      if (activity.startDate && activity.endDate) {
        const startDate = new Date(activity.startDate);
        const endDate = new Date(activity.endDate);
        if (endDate < startDate) {
          return "La fecha de fin no puede ser anterior a la fecha de inicio";
        }
      }
    }

    return true;
  }, [watch]);

  /**
   * Validación de montos
   */
  const validateAmounts = useCallback(() => {
    const estimatedValue = watch("estimatedValue");

    if (estimatedValue && estimatedValue > 10000000) {
      return "Montos superiores a $10.000.000 requieren aprobación previa";
    }

    return true;
  }, [watch]);

  /**
   * Agregar nueva actividad
   */
  const addActivity = useCallback(() => {
    const currentActivities = watch("actividades") || [];
    setValue("actividades", [
      ...currentActivities,
      {
        name: "",
        description: "",
        locationId: "",
        supplierId: "",
        startDate: "",
        endDate: "",
        estimatedValue: 0,
        statusActivity: "PENDIENTE",
      },
    ]);
  }, [watch, setValue]);

  /**
   * Eliminar actividad
   */
  const removeActivity = useCallback(
    (index: number) => {
      const currentActivities = watch("actividades") || [];
      setValue(
        "actividades",
        currentActivities.filter((_, i) => i !== index)
      );
    },
    [watch, setValue]
  );

  /**
   * Resetear formulario
   */
  const resetForm = useCallback(() => {
    reset(defaultValues);
  }, [reset, defaultValues]);

  /**
   * Estado de validez del formulario
   */
  const isValid = useMemo(() => {
    const title = watch("title");
    const description = watch("description");
    const dateValidation = validateDates();
    const amountValidation = validateAmounts();

    return (
      title &&
      description &&
      dateValidation === true &&
      amountValidation === true
    );
  }, [watch, validateDates, validateAmounts]);

  return {
    // React Hook Form methods
    methods,

    // Handlers
    handlers: {
      handleMasterActivitySelect,
      handleApplicantSelect,
      addActivity,
      removeActivity,
      resetForm,
    },

    // Validadores
    validators: {
      validateDates,
      validateAmounts,
    },

    // Estado
    state: {
      isValid,
      isEditing,
    },
  };
}
