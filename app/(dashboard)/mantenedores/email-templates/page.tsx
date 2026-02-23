"use client";

import { useMemo, useState } from "react";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import { EmailTemplate, useEmailTemplates } from "@/lib/hooks/use-email-templates";
import { getColumns, SortDirection } from "@/components/email-templates/columns";
import { TemplateForm } from "@/components/email-templates/template-form";
import { Input } from "@/components/ui/input";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";

export default function EmailTemplatesPage() {
    const { email_templates: texts } = maintenanceConfig;
    // Hooks
    const { data: templates = [], isLoading, isFetching, refetch } = useEmailTemplates();

    // State
    const [search, setSearch] = useState("");
    const [pageIndex, setPageIndex] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });

    // Handlers
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

    const filteredData = useMemo(() => {
        let result = templates.filter(item =>
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.subject.toLowerCase().includes(search.toLowerCase()) ||
            item.code.toLowerCase().includes(search.toLowerCase())
        );

        if (sortConfig.key && sortConfig.direction) {
            result.sort((a, b) => {
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
                    case "subject":
                        valA = a.subject.toLowerCase();
                        valB = b.subject.toLowerCase();
                        break;
                    default:
                        return 0;
                }

                if (valA < valB) return direction === "asc" ? -1 : 1;
                if (valA > valB) return direction === "asc" ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [templates, search, sortConfig]);

    const paginatedData = useMemo(() => {
        const start = (pageIndex - 1) * pageSize;
        const end = start + pageSize;
        return filteredData.slice(start, end);
    }, [filteredData, pageIndex, pageSize]);

    const pageCount = Math.ceil(filteredData.length / pageSize);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPageIndex(1);
    };

    return (
        <BaseMaintainer<EmailTemplate>
            title={texts.header.title}
            description={texts.header.description}
            addNewLabel="" // No permitimos crear nuevos templates, son fijos por sistema
            data={paginatedData}
            isLoading={isLoading}
            meta={{ total: filteredData.length, page: pageIndex, limit: pageSize, totalPages: pageCount }}
            onPageChange={setPageIndex}
            onPageSizeChange={(size) => {
                setPageSize(size);
                setPageIndex(1);
            }}
            onSearchChange={handleSearchChange}
            onRefresh={refetch}
            isRefreshing={isLoading || isFetching}
            getColumns={(handlers) => getColumns({
                ...handlers,
                currentSort: sortConfig,
                onSort: handleSort
            })}
            onDelete={() => { }} // No permitimos borrar
            filters={
                <Input
                    placeholder="Buscar plantilla..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="h-9 w-[250px]"
                />
            }
            renderForm={(mode, initialData, onCancel, onSuccess) => (
                <TemplateForm
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
    );
}
