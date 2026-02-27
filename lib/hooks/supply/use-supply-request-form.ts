/**
 * Custom Hook: Formulario de Solicitud de Insumos
 * Archivo: lib/hooks/supply/use-supply-request-form.ts
 * 
 * Lógica composable para el formulario de creación de solicitud
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useMemo, useState } from "react";
import {
  createSupplyRequestSchema,
  type CreateSupplyRequestInput,
  type SupplyRequestItem,
} from "@/lib/validations/supply-request";
import type { UnitMaster, MntSupplyCategory, MntInstallation } from "@prisma/client";
import { useRouter } from "next/navigation";
import { crearSolicitudInsumos } from "@/app/insumos/ingreso/actions";
import { toast } from "sonner";

interface UseSupplyRequestFormProps {
  categories: MntSupplyCategory[];
  units: UnitMaster[];
  installations: MntInstallation[];
  currentUserId: string;
}

export function useSupplyRequestForm({
  categories,
  units,
  installations,
  currentUserId,
}: UseSupplyRequestFormProps) {
  const router = useRouter();

  // 1. Valores por defecto
  const defaultValues = useMemo<CreateSupplyRequestInput>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      title: "",
      description: "",
      installationId: installations.length > 0 ? installations[0].id : "",
      requestedDate: tomorrow.toISOString().split("T")[0] as any,
      priority: "NORMAL",
      justification: "",
      observations: "",
      items: [],
    };
  }, [installations]);

  // 2. Inicializar formulario
  const methods = useForm<CreateSupplyRequestInput>({
    resolver: zodResolver(createSupplyRequestSchema),
    defaultValues,
    mode: "onBlur",
  });

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = methods;

  // 3. Handlers para gestión de items
  const items = watch("items");

  const addItem = useCallback(() => {
    const newItem: SupplyRequestItem = {
      categoryId: categories.length > 0 ? categories[0].id : "",
      itemName: "",
      quantity: 1,
      unit: "UNI",
      specifications: "",
      estimatedPrice: null,
      observations: "",
      urgencyLevel: 'NORMAL',
    };

    setValue("items", [...items, newItem], { shouldValidate: true });
  }, [items, categories, setValue]);

  const removeItem = useCallback(
    (index: number) => {
      const updatedItems = items.filter((_, i) => i !== index);
      setValue("items", updatedItems, { shouldValidate: true });
    },
    [items, setValue]
  );

  const updateItem = useCallback(
    (index: number, field: keyof SupplyRequestItem, value: any) => {
      const updatedItems = [...items];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };
      setValue("items", updatedItems, { shouldValidate: true });
    },
    [items, setValue]
  );

  // 4. Cálculos derivados
  const totalEstimatedValue = useMemo(() => {
    return items.reduce((total, item) => {
      const itemValue = (item.estimatedPrice || 0) * item.quantity;
      return total + itemValue;
    }, 0);
  }, [items]);

  // 5. Submit handler
  const onSubmit = useCallback(
    async (data: CreateSupplyRequestInput) => {
      try {
        const result = await crearSolicitudInsumos(data);

        if (result.success) {
          toast.success(`Solicitud creada exitosamente (${result.data.folio})`);
          router.push(`/insumos/${result.data.id}`);
        } else {
          toast.error(result.error || "Error al crear la solicitud");
        }
      } catch (error) {
        console.error("Error en submit:", error);
        toast.error("Error inesperado al crear la solicitud");
      }
    },
    [router]
  );

  // 6. Validadores custom
  const validateItems = useCallback(() => {
    if (items.length === 0) {
      return "Debe agregar al menos un item";
    }

    const hasEmptyNames = items.some((item) => !item.itemName.trim());
    if (hasEmptyNames) {
      return "Todos los items deben tener un nombre";
    }

    const hasInvalidQuantities = items.some((item) => item.quantity <= 0);
    if (hasInvalidQuantities) {
      return "Todas las cantidades deben ser mayores a 0";
    }

    return true;
  }, [items]);

  const validateRequestedDate = useCallback(() => {
    const requestedDate = watch("requestedDate");
    if (!requestedDate) return "La fecha es requerida";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = new Date(requestedDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return "La fecha no puede ser anterior a hoy";
    }

    return true;
  }, [watch]);

  // 7. Retornar API del hook
  return {
    methods,
    handlers: {
      handleSubmit: handleSubmit(onSubmit),
      addItem,
      removeItem,
      updateItem,
    },
    validators: {
      validateItems,
      validateRequestedDate,
    },
    state: {
      isSubmitting,
      itemsCount: items.length,
      totalEstimatedValue,
      items,
    },
    data: {
      categories,
      units,
      installations,
    },
  };
}
