"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSuppliers, useDeleteSupplier, Supplier, useSupplier } from "@/lib/hooks/mantencion/use-suppliers";
import { getSuppliersColumns, SortDirection } from "./columns";
import { SupplierForm } from "@/components/mantencion/supplier-form";
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

export default function SuppliersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const editId = searchParams.get("edit");
  const createMode = searchParams.get("create") === "1";
  // @ts-ignore
  const { mnt_suppliers: texts } = maintenanceConfig;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });

  const { data: queryData, isLoading, isFetching, refetch } = useSuppliers(page, pageSize, search) as any;
  const { data: itemToEdit, isLoading: isLoadingItem } = useSupplier(editId);
  const { mutate: deleteItem } = useDeleteSupplier();

  const [externalMode, setExternalMode] = useState<"table" | "create" | "edit" | undefined>(
    editId ? "edit" : createMode ? "create" : "table"
  );
  const [externalItem, setExternalItem] = useState<Supplier | null | undefined>(undefined);

  useEffect(() => {
    if (editId) {
      setExternalMode("edit");
      setExternalItem(itemToEdit || null);
    } else if (createMode) {
      setExternalMode("create");
      setExternalItem(null);
    } else {
      setExternalMode("table");
      setExternalItem(null);
    }
  }, [editId, createMode, itemToEdit]);

  const clearModeParams = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    params.delete("create");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    setExternalMode("table");
    setExternalItem(null);
  };

  const items = queryData?.data || [];
  const meta = queryData?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const sortedItems = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return items;

    return [...items].sort((a: Supplier, b: Supplier) => {
      const { key, direction } = sortConfig;
      let valA: any = "";
      let valB: any = "";

      switch (key) {
        case "legalName":
          valA = a.legalName?.toLowerCase() || "";
          valB = b.legalName?.toLowerCase() || "";
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

  const handleDelete = (item: Supplier) => {
    setDeleteTarget(item);
  };

  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const checkDelete = () => {
    if (!deleteTarget) return;
    deleteItem(deleteTarget.id, {
      onSuccess: () => {
        refetch();
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error("Error al eliminar (posiblemente referenciado)");
      },
    });
  };

  return (
    <div className="w-full">
      <BaseMaintainer<Supplier>
        title={texts?.header?.title || "Proveedores"}
        description={texts?.header?.description || "Gestione proveedores."}
        addNewLabel={texts?.actions?.add_new || "Nuevo Proveedor"}
        searchPlaceholder={texts?.actions?.search_placeholder}
        getColumns={(handlers) =>
          getSuppliersColumns({
            ...handlers,
            currentSort: sortConfig,
            onSort: handleSort,
          })
        }
        onDelete={handleDelete}
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
        onPreEdit={(item) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("edit", item.id);
          router.replace(`?${params.toString()}`);
        }}
        renderForm={(mode, initialData, onCancel, onSuccess) => {
          if (mode === "edit" && !initialData) {
            return (
              <div className="flex h-64 w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
              </div>
            );
          }
          return (
            <SupplierForm
              mode={mode}
              initialData={initialData}
              onCancel={() => {
                if (editId || createMode) clearModeParams();
                onCancel();
              }}
              onSuccess={() => {
                if (editId || createMode) clearModeParams();
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
        title={`¿Eliminar proveedor ${deleteTarget?.legalName || deleteTarget?.fantasyName}?`}
        description="Esta acción no se puede deshacer."
      />
    </div>
  );
}
