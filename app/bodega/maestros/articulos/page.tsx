"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import { ArticleForm } from "@/components/bodega/article-form";
import {
  BodegaArticle,
  useBodegaArticles,
  useCreateBodegaArticle,
  useDeleteBodegaArticle,
  useUpdateBodegaArticle,
} from "@/lib/hooks/bodega/use-bodega-articles";
import { getArticleColumns, SortDirection } from "./columns";
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

function DeleteAlertDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 text-white hover:bg-red-700">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function BodegaArticulosPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BodegaArticle | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });

  const { data: queryData, isLoading, isFetching, refetch } = useBodegaArticles(page, pageSize, search);
  const createMutation = useCreateBodegaArticle();
  const updateMutation = useUpdateBodegaArticle();
  const deleteMutation = useDeleteBodegaArticle();

  const items = queryData?.data || [];
  const meta = queryData?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

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
        case "unit":
          valA = a.unit.toLowerCase();
          valB = b.unit.toLowerCase();
          break;
        case "minimumStock":
          valA = Number(a.minimumStock);
          valB = Number(b.minimumStock);
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
    });
  };

  return (
    <>
      <BaseMaintainer<BodegaArticle>
        title="Maestro de Artículos"
        description="Administra artículos base para solicitudes, stock y reservas"
        addNewLabel="Nuevo Artículo"
        searchPlaceholder="Buscar por código o nombre"
        getColumns={(handlers) =>
          getArticleColumns({
            ...handlers,
            currentSort: sortConfig,
            onSort: handleSort,
          })
        }
        onDelete={(item) => setDeleteTarget(item)}
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
        isRefreshing={isLoading || isFetching}
        renderForm={(mode, initialData, onCancel, onSuccess) => (
          <ArticleForm
            initialData={initialData || undefined}
            isLoading={createMutation.isPending || updateMutation.isPending}
            onCancel={onCancel}
            onSubmit={async (data) => {
              try {
                if (mode === "create") {
                  await createMutation.mutateAsync(data);
                } else if (initialData) {
                  await updateMutation.mutateAsync({ id: initialData.id, ...data });
                }
                onSuccess();
                refetch();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "No se pudo guardar el artículo");
              }
            }}
          />
        )}
      />

      <DeleteAlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={`¿Eliminar artículo ${deleteTarget?.name || ""}?`}
        description="Esta acción no se puede deshacer."
      />
    </>
  );
}
