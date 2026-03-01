"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { BodegaCostCenter, useBodegaCostCenters, useCreateBodegaCostCenter, useUpdateBodegaCostCenter, useDeleteBodegaCostCenter } from "@/lib/hooks/bodega/use-bodega-masters";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import { getSimpleMasterColumns, SortDirection } from "@/components/bodega/simple-master-columns";
import { SimpleMasterForm } from "@/components/bodega/simple-master-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Diálogo de confirmación de eliminación
function DeleteAlertDialog({ open, onOpenChange, onConfirm, title, description }: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void; title: string; description: string }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="dark:text-white">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 text-white hover:bg-red-700 dark:text-white">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function BodegaCentrosCostoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BodegaCostCenter | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({
    key: null,
    direction: null,
  });

  // Estado inicial anti-flicker: si hay ?edit=X en URL, abrir directo en edición
  const [externalMode, setExternalMode] = useState<"table" | "edit" | undefined>(editId ? "edit" : "table");
  const [externalItem, setExternalItem] = useState<BodegaCostCenter | null | undefined>(undefined);

  const { data: queryData, isLoading, isFetching, refetch } = useBodegaCostCenters(search);
  const createMutation = useCreateBodegaCostCenter();
  const updateMutation = useUpdateBodegaCostCenter();
  const deleteMutation = useDeleteBodegaCostCenter();

  const items = queryData?.data || [];
  const meta = { total: items.length, page: 1, limit: 100, totalPages: 1 };

  // Ordenamiento en cliente (< 100 items)
  const sortedItems = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return items;

    return [...items].sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA: string | number = "";
      let valB: string | number = "";

      switch (key) {
        case "code":
          valA = a.code.toLowerCase();
          valB = b.code.toLowerCase();
          break;
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
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
  }, [items, sortConfig]);

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

  // Abrir edición y actualizar URL
  const openEdit = (item: BodegaCostCenter) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("edit", item.id);
    router.replace(`?${params.toString()}`);
    setExternalItem(item);
    setExternalMode("edit");
  };

  // Limpiar URL al cerrar edición
  const closeEdit = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    router.replace(`?${params.toString()}`);
    setExternalItem(null);
    setExternalMode("table");
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        refetch();
      },
      onError: (err) => {
        toast.error(err.message ?? "No se pudo eliminar el registro");
      },
    });
  };

  return (
    <>
      <BaseMaintainer<BodegaCostCenter>
        title="Centros de Costo"
        description="Administra los centros de costo para clasificar movimientos e ingresos de bodega."
        addNewLabel="Centro de Costo"
        searchPlaceholder="Buscar por código o nombre..."
        getColumns={(handlers) =>
          getSimpleMasterColumns({
            ...handlers,
            currentSort: sortConfig,
            onSort: handleSort,
          })
        }
        onDelete={(item) => setDeleteTarget(item)}
        data={sortedItems}
        isLoading={isLoading}
        meta={meta}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
        onSearchChange={(value) => setSearch(value)}
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isFetching}
        externalMode={externalMode}
        externalItem={externalItem}
        onPreEdit={openEdit}
        renderForm={(mode, initialData, onCancel, onSuccess) => {
          // Spinner mientras se carga el item en modo edición
          if (mode === "edit" && !initialData) {
            return (
              <div className="flex h-64 w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            );
          }

          return (
            <SimpleMasterForm
              initialData={initialData ?? undefined}
              isLoading={createMutation.isPending || updateMutation.isPending}
              onCancel={() => {
                closeEdit();
                onCancel();
              }}
              onSubmit={async (data) => {
                try {
                  if (mode === "create") {
                    await createMutation.mutateAsync(data);
                  } else if (initialData) {
                    await updateMutation.mutateAsync({ id: initialData.id, data });
                  }
                  closeEdit();
                  onSuccess();
                  refetch();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "No se pudo guardar el registro");
                }
              }}
            />
          );
        }}
      />

      <DeleteAlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={`¿Eliminar centro de costo "${deleteTarget?.name || ""}"?`}
        description="Esta acción no se puede deshacer. Los movimientos que referencien este centro de costo no serán afectados."
      />
    </>
  );
}
