"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Info, Shield, Eye, Clock, Globe, Terminal } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export type AuditLog = {
    id: string;
    userId: string | null;
    eventType: string;
    module: string | null;
    pageUrl: string | null;
    endpoint: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: any;
    createdAt: string;
    user: {
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl: string | null;
    } | null;
};

const getEventBadge = (type: string) => {
    switch (type.toUpperCase()) {
        case 'LOGIN':
        case 'LOGIN_SUCCESS':
            return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">LOGIN</Badge>;
        case 'LOGIN_FAILURE':
            return <Badge variant="destructive">ERROR</Badge>;
        case 'CREATE':
        case 'USER_CREATE':
            return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">CREAR</Badge>;
        case 'UPDATE':
        case 'USER_UPDATE':
            return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">EDITAR</Badge>;
        case 'DELETE':
        case 'USER_DELETE':
            return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">BORRAR</Badge>;
        case 'RUT_UPDATE':
            return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800">RUT EDIT</Badge>;
        default:
            return <Badge variant="secondary">{type}</Badge>;
    }
};

import { ArrowUp, ArrowDown } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;

const SortableHeader = ({ title, sortKey, currentSort, onSort }: { title: string, sortKey: string, currentSort: { key: string | null, direction: SortDirection }, onSort: (key: string) => void }) => {
    const isSorted = currentSort.key === sortKey;
    const direction = isSorted ? currentSort.direction : null;

    return (
        <Button
            variant="ghost"
            onClick={() => onSort(sortKey)}
            className="-ml-4 h-8 data-[state=open]:bg-accent hover:bg-accent/50"
        >
            <span>{title}</span>
            {direction === "asc" && <ArrowUp className="ml-2 h-4 w-4" />}
            {direction === "desc" && <ArrowDown className="ml-2 h-4 w-4" />}
            {!direction && <div className="ml-2 h-4 w-4" aria-hidden="true" />}
        </Button>
    );
};

// Configuración de columnas ordenables
const SORTABLE_COLUMNS = {
    createdAt: true,
    user: true,
    eventType: true,
    module: true,
    ipAddress: true
};

interface GetAuditColumnsProps {
    currentSort: { key: string | null; direction: SortDirection };
    onSort: (key: string) => void;
    texts: any;
}

export const getAuditColumns = ({ currentSort, onSort, texts }: GetAuditColumnsProps): ColumnDef<AuditLog>[] => [
    {
        accessorKey: "createdAt",
        header: () => SORTABLE_COLUMNS.createdAt
            ? <SortableHeader title={texts.table.date} sortKey="createdAt" currentSort={currentSort} onSort={onSort} />
            : texts.table.date,
        cell: ({ row }) => {
            const date = new Date(row.getValue("createdAt"));
            return (
                <div className="flex flex-col">
                    <span className="text-sm font-medium">
                        {format(date, "dd MMM, yyyy", { locale: es })}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase">
                        {format(date, "HH:mm:ss 'hrs'")}
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: "user",
        header: () => SORTABLE_COLUMNS.user
            ? <SortableHeader title={texts.table.user} sortKey="user" currentSort={currentSort} onSort={onSort} />
            : texts.table.user,
        cell: ({ row }) => {
            const user = row.original.user;
            if (!user) return (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs font-medium italic">{texts.modal.system}</span>
                </div>
            );

            return (
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border">
                        <AvatarImage src={user.avatarUrl || ""} />
                        <AvatarFallback className="bg-slate-100 text-[10px]">
                            {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate max-w-[120px]">
                            {user.firstName} {user.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {user.email}
                        </span>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "eventType",
        header: () => SORTABLE_COLUMNS.eventType
            ? <SortableHeader title={texts.table.event} sortKey="eventType" currentSort={currentSort} onSort={onSort} />
            : texts.table.event,
        cell: ({ row }) => getEventBadge(row.getValue("eventType")),
    },
    {
        accessorKey: "module",
        header: () => SORTABLE_COLUMNS.module
            ? <SortableHeader title={texts.table.module} sortKey="module" currentSort={currentSort} onSort={onSort} />
            : texts.table.module,
        cell: ({ row }) => (
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">
                {row.getValue("module") || "General"}
            </span>
        ),
    },
    {
        accessorKey: "ipAddress",
        header: () => SORTABLE_COLUMNS.ipAddress
            ? <SortableHeader title={texts.table.ip} sortKey="ipAddress" currentSort={currentSort} onSort={onSort} />
            : texts.table.ip,
        cell: ({ row }) => (
            <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                {row.getValue("ipAddress") || "0.0.0.0"}
            </code>
        ),
    },
    {
        id: "details",
        header: texts.table.details,
        cell: ({ row }) => {
            const log = row.original;
            return (
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-2 text-slate-500 hover:text-[#283c7f] hover:bg-slate-100">
                            <Eye className="h-3.5 w-3.5" />
                            <span className="text-xs">{texts.table.details}</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Info className="h-5 w-5 text-[#283c7f]" />
                                {texts.modal.title}
                            </DialogTitle>
                        </DialogHeader>

                        <ScrollArea className="pr-4">
                            <div className="space-y-6 pt-4">
                                {/* Info Principal */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> {texts.modal.field_date}
                                        </p>
                                        <p className="text-sm font-medium">
                                            {format(new Date(log.createdAt), "PPP p", { locale: es })}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                            <Shield className="h-3 w-3" /> {texts.modal.field_event}
                                        </p>
                                        <div>{getEventBadge(log.eventType)}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                            <Globe className="h-3 w-3" /> {texts.modal.field_ip}
                                        </p>
                                        <code className="text-xs">{log.ipAddress || "0.0.0.0"}</code>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                            <Terminal className="h-3 w-3" /> {texts.modal.field_endpoint}
                                        </p>
                                        <code className="text-xs">{log.endpoint || "N/A"}</code>
                                    </div>
                                </div>

                                {/* URL */}
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">{texts.modal.field_url}</p>
                                    <p className="text-xs p-2 bg-slate-50 dark:bg-slate-900 rounded border border-dashed italic break-all">
                                        {log.pageUrl || "N/A"}
                                    </p>
                                </div>

                                {/* Actor */}
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">{texts.modal.field_actor}</p>
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                        <Avatar className="h-10 w-10 border shadow-sm">
                                            <AvatarImage src={log.user?.avatarUrl || ""} />
                                            <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                {log.user ? `${log.user.firstName[0]}${log.user.lastName[0]}` : "S"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <p className="text-sm font-bold">
                                                {log.user ? `${log.user.firstName} ${log.user.lastName}` : texts.modal.system}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {log.user ? log.user.email : texts.modal.auto_process}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Metadata JSON */}
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                        {texts.modal.field_metadata}
                                    </p>

                                    {log.metadata?.resetUrl && (
                                        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                                            <p className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 mb-1">{texts.modal.recovery_link}</p>
                                            <a
                                                href={log.metadata.resetUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-amber-900 dark:text-amber-200 hover:underline break-all font-mono"
                                            >
                                                {log.metadata.resetUrl}
                                            </a>
                                        </div>
                                    )}

                                    <div className="relative group">
                                        <pre className="text-[11px] bg-slate-950 text-slate-300 p-4 rounded-lg overflow-auto max-h-[300px] font-mono leading-relaxed">
                                            {JSON.stringify(log.metadata, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            );
        },
    },
];
