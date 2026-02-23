"use client";

import { useState, useMemo } from "react";
import { useAuditLogs, useAuditMetadata, useExportAudit } from "@/lib/hooks/use-audit";
import { getAuditColumns, SortDirection, AuditLog } from "@/components/audit/audit-table-columns";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Download, FilterX, Loader2 } from "lucide-react"
import auditConfig from "@/lib/config/ui/audit.json";

export default function AuditoriaPage() {
    const { header, filters: texts, table, modal } = auditConfig;
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });

    // Filtros avanzados
    const [userId, setUserId] = useState("all");
    const [eventType, setEventType] = useState("all");
    const [module, setModule] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const filters = useMemo(() => ({
        userId,
        eventType,
        module,
        from: fromDate,
        to: toDate,
        search
    }), [userId, eventType, module, fromDate, toDate, search]);

    // Hooks
    const { data, isLoading } = useAuditLogs(page, pageSize, filters);
    const { data: metadata } = useAuditMetadata();
    const { mutate: exportToExcel, isPending: isExporting } = useExportAudit();

    const logs = data?.data || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

    const sortedLogs = useMemo(() => {
        if (!sortConfig.key || !sortConfig.direction) return logs;

        return [...logs].sort((a: AuditLog, b: AuditLog) => {
            const { key, direction } = sortConfig;
            let valA: any = "";
            let valB: any = "";

            switch (key) {
                case "createdAt":
                    valA = new Date(a.createdAt).getTime();
                    valB = new Date(b.createdAt).getTime();
                    break;
                case "user":
                    valA = a.user ? `${a.user.firstName} ${a.user.lastName}`.toLowerCase() : "";
                    valB = b.user ? `${b.user.firstName} ${b.user.lastName}`.toLowerCase() : "";
                    break;
                case "eventType":
                    valA = a.eventType.toLowerCase();
                    valB = b.eventType.toLowerCase();
                    break;
                case "module":
                    valA = a.module?.toLowerCase() || "";
                    valB = b.module?.toLowerCase() || "";
                    break;
                case "ipAddress":
                    valA = a.ipAddress || "";
                    valB = b.ipAddress || "";
                    break;
                default:
                    return 0;
            }

            if (valA < valB) return direction === "asc" ? -1 : 1;
            if (valA > valB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [logs, sortConfig]);

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

    const resetFilters = () => {
        setUserId("all");
        setEventType("all");
        setModule("all");
        setFromDate("");
        setToDate("");
        setSearch("");
    };

    const handleExport = () => {
        exportToExcel(filters);
    };

    const FilterBar = (
        <div className="flex flex-wrap items-end gap-3 pb-2">
            <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{texts.user}</span>
                <Select value={userId} onValueChange={setUserId}>
                    <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder={texts.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{texts.all_users}</SelectItem>
                        {metadata?.users?.map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{texts.event}</span>
                <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder={texts.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{texts.all_events}</SelectItem>
                        {metadata?.eventTypes?.map((et: string) => (
                            <SelectItem key={et} value={et}>{et}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{texts.module}</span>
                <Select value={module} onValueChange={setModule}>
                    <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder={texts.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{texts.all_modules}</SelectItem>
                        {metadata?.modules?.map((m: string) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{texts.from}</span>
                <Input
                    type="date"
                    className="w-[140px] h-9"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    autoComplete="off"
                />
            </div>

            <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{texts.to}</span>
                <Input
                    type="date"
                    className="w-[140px] h-9"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    autoComplete="off"
                />
            </div>

            <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={resetFilters} title={texts.clear}>
                    <FilterX className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    className="h-9 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-900 dark:text-green-400"
                    onClick={handleExport}
                    disabled={isExporting || logs.length === 0}
                >
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    {texts.export_excel}
                </Button>
            </div>
        </div>
    );

    return (
        <BaseMaintainer<any>
            title={header.title}
            description={header.description}
            addNewLabel="" // Ocultar el botón de agregar
            getColumns={() => getAuditColumns({
                currentSort: sortConfig,
                onSort: handleSort,
                texts: auditConfig
            })}
            onDelete={() => { }} // No eliminable
            data={sortedLogs}
            isLoading={isLoading}
            meta={meta}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSearchChange={setSearch}
            filters={FilterBar}
            renderForm={() => <div />} // No usado
        />
    );
}
