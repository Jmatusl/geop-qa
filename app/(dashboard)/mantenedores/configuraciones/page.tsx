"use client";

import { useState, useMemo } from "react";
import { useSettings, useDeleteSetting, AppSetting } from "@/lib/hooks/use-settings";
import { getSettingColumns, SortDirection } from "@/components/settings/settings-table-columns";
import { SettingForm } from "@/components/settings/setting-form";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailConfigForm } from "@/components/settings/forms/email-config-form";
import { AuthMailConfigForm } from "@/components/settings/forms/auth-mail-config-form";
import { NotificationRulesForm } from "@/components/settings/forms/notification-rules-form";
import { ExpirationConfigForm } from "@/components/settings/forms/expiration-config-form";
import { PersonImageConfigForm } from "@/components/settings/forms/person-image-config-form";
import { GoogleSSOForm } from "@/components/settings/forms/google-sso-form";
import { StorageConfigForm } from "@/components/settings/forms/storage-config-form";
import { SecurityPoliciesForm } from "@/components/settings/forms/security-policies-form";
import { SecurityMessagesForm } from "@/components/settings/forms/security-messages-form";
import { UIConfigForm } from "@/components/settings/forms/ui-config-form";
import { ReportConfigForm } from "@/components/settings/forms/report-config-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });

  // Estado para Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [settingToDelete, setSettingToDelete] = useState<AppSetting | null>(null);

  const { data: settingsData, isLoading, isFetching, refetch } = useSettings();
  const { mutate: deleteSetting } = useDeleteSetting();

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

  // 1. Filtrado
  const filteredData = useMemo(() => {
    if (!settingsData) return [];

    let result = [...settingsData];

    if (search) {
      result = result.filter((item) => item.key.toLowerCase().includes(search.toLowerCase()) || (item.description && item.description.toLowerCase().includes(search.toLowerCase())));
    }

    // 2. Ordenamiento
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        const { key, direction } = sortConfig;
        let valA: any = "";
        let valB: any = "";

        switch (key) {
          case "key":
            valA = a.key.toLowerCase();
            valB = b.key.toLowerCase();
            break;
          case "description":
            valA = (a.description || "").toLowerCase();
            valB = (b.description || "").toLowerCase();
            break;
          case "value":
            valA = typeof a.value === "object" ? JSON.stringify(a.value) : String(a.value);
            valB = typeof b.value === "object" ? JSON.stringify(b.value) : String(b.value);
            break;
          case "version":
            valA = a.version;
            valB = b.version;
            break;
          case "isActive":
            valA = a.isActive ? 1 : 0;
            valB = b.isActive ? 1 : 0;
            break;
        }

        if (valA < valB) return direction === "asc" ? -1 : 1;
        if (valA > valB) return direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [settingsData, search, sortConfig]);

  // 3. Paginación
  const paginatedData = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, pageIndex, pageSize]);

  const pageCount = Math.ceil(filteredData.length / pageSize);

  const handleConfirmDelete = () => {
    if (!settingToDelete) return;
    deleteSetting(settingToDelete.id, {
      onSuccess: () => {
        toast.success(`Configuración ${settingToDelete.key} eliminada`);
        setDeleteDialogOpen(false);
        setSettingToDelete(null);
        refetch();
      },
    });
  };

  // Helper para buscar setting específica
  const getSettingByKey = (key: string) => settingsData?.find((s) => s.key === key);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando configuraciones...</div>;
  }

  return (
    <div className="flex flex-col space-y-6 pt-6 pb-12 w-full">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Configuraciones del Sistema</h1>
        <p className="text-muted-foreground">Administra las variables globales, parámetros de correo y reglas de negocio.</p>
      </div>

      <Tabs defaultValue="communications" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-4xl bg-muted/50 p-1">
          <TabsTrigger value="communications">Comunicación</TabsTrigger>
          <TabsTrigger value="system">Seguridad</TabsTrigger>
          <TabsTrigger value="integrations">Integración</TabsTrigger>
          <TabsTrigger value="appearance">Apariencia</TabsTrigger>
          <TabsTrigger value="explorer">Explorador</TabsTrigger>
        </TabsList>

        <TabsContent value="explorer" className="mt-6">
          <BaseMaintainer<AppSetting>
            title="Explorador de Variables"
            description="Vista técnica de todas las variables almacenadas."
            addNewLabel="Nueva Variable"
            getColumns={(handlers) =>
              getSettingColumns({
                ...handlers,
                onDelete: (item) => {
                  setSettingToDelete(item);
                  setDeleteDialogOpen(true);
                },
                currentSort: sortConfig,
                onSort: handleSort,
              })
            }
            onDelete={() => {}} // Manejado arriba
            data={paginatedData}
            isLoading={isLoading}
            meta={{
              total: filteredData.length,
              totalPages: pageCount,
              page: pageIndex,
              limit: pageSize,
            }}
            onPageChange={setPageIndex}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageIndex(1);
            }}
            onSearchChange={(val) => {
              setSearch(val);
              setPageIndex(1);
            }}
            onRefresh={() => refetch()}
            isRefreshing={isLoading || isFetching}
            renderForm={(mode, initialData, onCancel, onSuccess) => (
              <SettingForm
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
        </TabsContent>

        <TabsContent value="communications" className="mt-0 space-y-0">
          {/* EMAIL_CONFIG */}
          {getSettingByKey("EMAIL_CONFIG") && <EmailConfigForm setting={getSettingByKey("EMAIL_CONFIG")!} />}

          {/* MAIL_CONFIG-AUTH */}
          {getSettingByKey("MAIL_CONFIG-AUTH") && <AuthMailConfigForm setting={getSettingByKey("MAIL_CONFIG-AUTH")!} />}

          {/* NOTIFICATION_CONFIG */}
          {getSettingByKey("NOTIFICATION_CONFIG") && <NotificationRulesForm setting={getSettingByKey("NOTIFICATION_CONFIG")!} />}

          {/* SECURITY_MESSAGES (Fits better here as it implies communication to user) */}
          {getSettingByKey("SECURITY_MESSAGES") && <SecurityMessagesForm setting={getSettingByKey("SECURITY_MESSAGES")!} />}
        </TabsContent>

        <TabsContent value="system" className="mt-0 space-y-0">
          {/* SECURITY_POLICIES */}
          {getSettingByKey("SECURITY_POLICIES") && <SecurityPoliciesForm setting={getSettingByKey("SECURITY_POLICIES")!} />}

          {/* EXPIRATION_CONFIG */}
          {getSettingByKey("EXPIRATION_CONFIG") && <ExpirationConfigForm setting={getSettingByKey("EXPIRATION_CONFIG")!} />}
        </TabsContent>

        <TabsContent value="integrations" className="mt-0 space-y-8">
          {/* GOOGLE_SSO_CONFIG */}
          {getSettingByKey("GOOGLE_SSO_CONFIG") && <GoogleSSOForm setting={getSettingByKey("GOOGLE_SSO_CONFIG")!} />}

          {/* STORAGE_CONFIG */}
          {getSettingByKey("STORAGE_CONFIG") && <StorageConfigForm setting={getSettingByKey("STORAGE_CONFIG")!} />}
        </TabsContent>

        <TabsContent value="appearance" className="mt-0 space-y-0">
          {/* UI_CONFIG */}
          {getSettingByKey("UI_CONFIG") && <UIConfigForm setting={getSettingByKey("UI_CONFIG")!} />}

          {/* REPORT_CONFIG */}
          {getSettingByKey("REPORT_CONFIG") && <ReportConfigForm setting={getSettingByKey("REPORT_CONFIG")!} />}

          {/* PERSON_IMAGE_CONFIG (Moved here as it relates to UI presentation) */}
          {getSettingByKey("PERSON_IMAGE_CONFIG") && <PersonImageConfigForm setting={getSettingByKey("PERSON_IMAGE_CONFIG")!} />}
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la configuración <strong>{settingToDelete?.key}</strong> del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSettingToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
