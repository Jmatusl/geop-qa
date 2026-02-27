/**
 * Página: Mantenedor de Unidades de Medida
 * Ruta: /mantenedores/unidades
 * 
 * Gestión CRUD de unidades de medida (Kg, Litros, Metros, Unidades, etc.)
 */

"use client";

import { useState, useMemo } from "react";
import { useUnits, useDeleteUnit } from "@/lib/hooks/units/use-units";
import { getColumns } from "@/components/units/columns";
import { UnitForm } from "@/components/units/unit-form";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";
import { UnitMaster } from "@prisma/client";
import type { CreateUnitInput } from "@/lib/validations/units";
import { useCreateUnit, useUpdateUnit } from "@/lib/hooks/units/use-units";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SortDirection = "asc" | "desc" | null;

export default function UnitsPage() {
  const { unidades: texts } = maintenanceConfig;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({
    key: null,
    direction: null,
  });

  // Estado para Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<UnitMaster | null>(null);

  // Hooks de datos
  const { data: queryData, isLoading, isFetching, refetch } = useUnits({
    page,
    pageSize,
    search,
  });
  const { mutate: deleteUnit } = useDeleteUnit();

  const units = queryData?.data || [];
  const meta = queryData?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

  // Ordenamiento lado cliente
  const sortedUnits = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return units;

    return [...units].sort((a: UnitMaster, b: UnitMaster) => {
      const { key, direction } = sortConfig;
      let valA: any = "";
      let valB: any = "";

      switch (key) {
        case "code":
          valA = a.code.toLowerCase();
          valB = b.code.toLowerCase();
          break;
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "category":
          valA = a.category.toLowerCase();
          valB = b.category.toLowerCase();
          break;
        case "isActive":
          valA = a.isActive ? 1 : 0;
          valB = b.isActive ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [units, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current.key === key) {
        if (current.direction === "asc") return { key, direction: "desc" };
        if (current.direction === "desc") return { key: null, direction: null };
        return { key, direction: "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const handleConfirmDelete = () => {
    if (!unitToDelete) return;
    deleteUnit(unitToDelete.id, {
      onSuccess: () => {
        toast.success(`Unidad ${unitToDelete.name} eliminada`);
        setDeleteDialogOpen(false);
        setUnitToDelete(null);
        refetch();
      },
    });
  };

  return (
    <>
      <BaseMaintainer<UnitMaster>
        title={texts.header.title}
        description={texts.header.description}
        addNewLabel={texts.actions.add_new}
        getColumns={(handlers) =>
          getColumns({
            ...handlers,
            onDelete: (unit) => {
              setUnitToDelete(unit);
              setDeleteDialogOpen(true);
            },
          })
        }
        onDelete={() => {}}
        data={sortedUnits}
        isLoading={isLoading}
        meta={meta}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isFetching}
        searchPlaceholder={texts.actions.search_placeholder}
        renderForm={(mode, initialData, onCancel, onSuccess) => (
          <UnitFormWrapper
            mode={mode}
            initialData={initialData}
            onCancel={onCancel}
            onSuccess={() => {
              refetch();
              onSuccess();
            }}
          />
        )}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará como inactiva la unidad <strong>{unitToDelete?.name}</strong> ({unitToDelete?.code}).
              <br />
              <br />
              Las unidades inactivas no estarán disponibles para nuevas solicitudes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnitToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Wrapper del formulario para integrarlo con BaseMaintainer
 */
interface UnitFormWrapperProps {
  mode: "create" | "edit";
  initialData: UnitMaster | null;
  onCancel: () => void;
  onSuccess: () => void;
}

function UnitFormWrapper({ mode, initialData, onCancel, onSuccess }: UnitFormWrapperProps) {
  const { mutate: createUnit, isPending: isCreating } = useCreateUnit();
  const { mutate: updateUnit, isPending: isUpdating } = useUpdateUnit();

  const isLoading = isCreating || isUpdating;

  const handleSubmit = (data: CreateUnitInput) => {
    if (mode === "create") {
      createUnit(data, {
        onSuccess: () => {
          onSuccess();
        },
      });
    } else if (mode === "edit" && initialData) {
      updateUnit(
        { id: initialData.id, data },
        {
          onSuccess: () => {
            onSuccess();
          },
        }
      );
    }
  };

  return (
    <UnitForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isLoading={isLoading}
    />
  );
}
