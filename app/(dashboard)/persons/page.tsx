"use client";

import { useState, useMemo } from "react";
import { usePersons, useDeletePerson, Person } from "@/lib/hooks/use-persons";
import { getPersonsColumns, SortDirection } from "./columns";
import { PersonFormBasic } from "@/components/persons/person-form-basic";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { BulkSupervisorAssignmentDialog } from "@/components/persons/bulk-supervisor-assignment-dialog";

function DeleteAlertDialog({ open, onOpenChange, onConfirm, title, description }: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void; title: string; description: string }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function PersonsPage() {
  // @ts-ignore
  const { persons: texts } = maintenanceConfig;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });

  const { data: queryData, isLoading, isFetching, refetch } = usePersons(page, pageSize, search) as any;
  const { mutate: deleteItem } = useDeletePerson();

  const items = queryData?.data || [];
  const meta = queryData?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const sortedItems = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return items;

    return [...items].sort((a: Person, b: Person) => {
      const { key, direction } = sortConfig;
      let valA: any = "";
      let valB: any = "";

      switch (key) {
        case "rut":
          valA = a.rut.toLowerCase();
          valB = b.rut.toLowerCase();
          break;
        case "firstName":
          valA = a.firstName.toLowerCase();
          valB = b.firstName.toLowerCase();
          break;
        case "email":
          valA = a.email?.toLowerCase() || "";
          valB = b.email?.toLowerCase() || "";
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

  const handleDelete = (item: Person) => {
    setDeleteTarget(item);
  };

  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);

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
    <>
      <BaseMaintainer<Person>
        title={texts?.header?.title || "Trabajadores"}
        description={texts?.header?.description || "Gestión de personal"}
        addNewLabel={texts?.actions?.add_new || "Nuevo Trabajador"}
        getColumns={(handlers) =>
          getPersonsColumns({
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
        isRefreshing={isLoading || isFetching}
        headerActions={<BulkSupervisorAssignmentDialog />}
        renderForm={(mode, initialData, onCancel, onSuccess) => (
          <PersonFormBasic
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

      <DeleteAlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={checkDelete}
        title={`¿Eliminar trabajador ${deleteTarget?.firstName} ${deleteTarget?.lastName}?`}
        description="Se marcará como eliminado pero los registros históricos pueden conservarse."
      />
    </>
  );
}
