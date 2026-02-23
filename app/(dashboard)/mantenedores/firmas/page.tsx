"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSignatures, useDeleteSignature, Signature, useSignature } from "@/lib/hooks/use-signatures";
import { getSignaturesColumns, SortDirection } from "./columns";
import { SignatureForm } from "@/components/maintainer/signature-form";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
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

export default function SignaturesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });

  const { data: items = [], isLoading, isFetching, refetch } = useSignatures(search);
  const { data: itemToEdit, isLoading: isLoadingItem } = useSignature(editId);
  const { mutate: deleteItem } = useDeleteSignature();

  const [externalMode, setExternalMode] = useState<"table" | "edit" | undefined>(editId ? "edit" : "table");
  const [externalItem, setExternalItem] = useState<Signature | null | undefined>(undefined);

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

  const sortedItems = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return items;

    return [...items].sort((a: Signature, b: Signature) => {
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

  const handleDelete = (item: Signature) => {
    setDeleteTarget(item);
  };

  const [deleteTarget, setDeleteTarget] = useState<Signature | null>(null);

  const checkDelete = () => {
    if (!deleteTarget) return;
    deleteItem(deleteTarget.id, {
      onSuccess: () => {
        refetch();
        setDeleteTarget(null);
      },
      onError: (err: any) => {
        toast.error(err.message || "Error al eliminar");
      },
    });
  };

  return (
    <div className="w-full">
      <BaseMaintainer<Signature>
        title="Mantenedor de Firmas"
        description="Gestione las firmas digitales globales del sistema."
        addNewLabel="Nueva Firma"
        searchPlaceholder="Buscar por nombre..."
        getColumns={(handlers) =>
          getSignaturesColumns({
            ...handlers,
            currentSort: sortConfig,
            onSort: handleSort,
          })
        }
        onDelete={handleDelete}
        data={sortedItems}
        isLoading={isLoading}
        // BaseMaintainer uses internal pagination if meta is not provided,
        // but here we are usingClient-side sorting on all data for simplicity as requested/standard
        meta={{
          total: sortedItems.length,
          page: 1,
          limit: sortedItems.length,
          totalPages: 1,
        }}
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isFetching || isLoadingItem}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        onSearchChange={setSearch}
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
            <SignatureForm
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
        title={`¿Eliminar firma ${deleteTarget?.name}?`}
        description="Esta acción eliminará permanentemente la firma del sistema."
      />
    </div>
  );
}
