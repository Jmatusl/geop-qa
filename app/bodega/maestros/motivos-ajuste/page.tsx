"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  BodegaAdjustmentReason,
  useBodegaAdjustmentReasons,
  useBodegaAdjustmentReason,
  useCreateBodegaAdjustmentReason,
  useUpdateBodegaAdjustmentReason,
  useDeleteBodegaAdjustmentReason,
} from "@/lib/hooks/bodega/use-bodega-masters";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import { getSimpleMasterColumns, SortDirection } from "@/components/bodega/simple-master-columns";
import { SimpleMasterForm } from "@/components/bodega/simple-master-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

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

export default function BodegaMotivosAjustePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id") || searchParams.get("edit");

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BodegaAdjustmentReason | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({
    key: null,
    direction: null,
  });

  const { data: queryData, isLoading, isFetching, refetch } = useBodegaAdjustmentReasons(search);
  const { data: singleData, isLoading: isLoadingSingle } = useBodegaAdjustmentReason(editId);
  const createMutation = useCreateBodegaAdjustmentReason();
  const updateMutation = useUpdateBodegaAdjustmentReason();
  const deleteMutation = useDeleteBodegaAdjustmentReason();

  const items = queryData?.data || [];
  const meta = { total: items.length, page: 1, limit: 100, totalPages: 1 };

  const externalMode = editId ? ("edit" as const) : ("table" as const);
  const externalItem = useMemo(() => {
    if (!editId) return null;
    const foundLocal = items.find((i: BodegaAdjustmentReason) => i.id === editId);
    if (foundLocal) return foundLocal;
    if (singleData && singleData.id === editId) return singleData;
    return undefined; // Loading
  }, [editId, items, singleData]);

  const handleModeChange = (mode: "table" | "create" | "edit", item: BodegaAdjustmentReason | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "edit" && item) {
      params.set("id", item.id);
    } else {
      params.delete("id");
      params.delete("edit");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

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
      <BaseMaintainer<BodegaAdjustmentReason>
        title="Motivos de Ajuste"
        description="Administra los motivos válidos para registrar ajustes de stock en bodega."
        addNewLabel="Motivo de Ajuste"
        searchPlaceholder="Buscar por código o nombre..."
        externalMode={externalMode}
        externalItem={externalItem}
        onModeChange={handleModeChange}
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
        renderForm={(mode, initialData, onCancel, onSuccess) => {
          if (mode === "edit" && !initialData) {
            return (
              <div className="flex h-[300px] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            );
          }
          return (
            <SimpleMasterForm
              initialData={initialData ?? undefined}
              isLoading={createMutation.isPending || updateMutation.isPending}
              onCancel={onCancel}
              onSubmit={async (data) => {
                try {
                  if (mode === "create") {
                    await createMutation.mutateAsync(data);
                  } else if (initialData) {
                    await updateMutation.mutateAsync({ id: initialData.id, data });
                  }
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
        title={`¿Eliminar motivo "${deleteTarget?.name || ""}"?`}
        description="Esta acción no se puede deshacer."
      />
    </>
  );
}
