"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEquipments, useDeleteEquipment, useEquipment, Equipment } from "@/lib/hooks/mantencion/use-equipments";
import { getEquipmentsColumns, SortDirection } from "./columns";
import { EquipmentForm } from "@/components/mantencion/equipment-form";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white dark:text-white">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function EquipmentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");

  // @ts-ignore
  const { mnt_equipos: texts } = maintenanceConfig;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });

  const { data: queryData, isLoading, isFetching, refetch } = useEquipments(page, pageSize, search) as any;
  const { data: itemToEdit, isLoading: isLoadingItem } = useEquipment(editId);
  const { mutate: deleteItem } = useDeleteEquipment();

  const [externalMode, setExternalMode] = useState<"table" | "edit" | undefined>(editId ? "edit" : "table");
  const [externalItem, setExternalItem] = useState<Equipment | null | undefined>(undefined);

  useEffect(() => {
    if (editId) {
      setExternalMode("edit");
      setExternalItem(itemToEdit || null);
    } else {
      setExternalMode("table");
      setExternalItem(null);
    }
  }, [editId, itemToEdit]);

  const removeEditParam = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    router.replace(`?${params.toString()}`);
    setExternalMode("table");
    setExternalItem(null);
  };

  const items = queryData?.data || [];
  const meta = queryData?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const sortedItems = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return items;

    return [...items].sort((a: Equipment, b: Equipment) => {
      const { key, direction } = sortConfig;
      let valA: any = "";
      let valB: any = "";

      switch (key) {
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

  const handleDelete = (item: Equipment) => {
    setDeleteTarget(item);
  };

  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);

  const checkDelete = () => {
    if (!deleteTarget) return;
    deleteItem(deleteTarget.id, {
      onSuccess: () => {
        refetch();
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error("Error al eliminar (posiblemente referenciado o con datos)");
      },
    });
  };

  return (
    <div className="w-full">
      <BaseMaintainer<Equipment>
        title={texts?.header?.title || "Equipos"}
        description={texts?.header?.description || "Registro y control de maquinarias y equipos."}
        addNewLabel={texts?.actions?.add_new || "Nuevo Equipo"}
        searchPlaceholder={texts?.actions?.search_placeholder}
        getColumns={(handlers) =>
          getEquipmentsColumns({
            ...handlers,
            currentSort: sortConfig,
            onSort: handleSort,
          })
        }
        onDelete={handleDelete}
        onPreEdit={(item) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("edit", item.id);
          router.replace(`?${params.toString()}`);
        }}
        data={sortedItems}
        isLoading={isLoading}
        meta={meta}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isFetching || isLoadingItem}
        externalMode={externalMode}
        externalItem={externalItem}
        renderForm={(mode, initialData, onCancel, onSuccess) => {
          if (mode === "edit" && !initialData) {
            return (
              <div className="flex w-full h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
              </div>
            );
          }
          return (
            <EquipmentForm
              mode={mode}
              initialData={initialData}
              onCancel={() => {
                if (editId) removeEditParam();
                onCancel();
              }}
              onSuccess={() => {
                if (editId) removeEditParam();
                refetch();
                onSuccess();
              }}
            />
          );
        }}
      />

      <DeleteAlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={checkDelete}
        title={`¿Eliminar equipo ${deleteTarget?.name}?`}
        description="Se eliminará la ficha central de mantenimiento para este equipo."
      />
    </div>
  );
}
