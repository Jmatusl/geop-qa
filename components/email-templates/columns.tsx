import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { EmailTemplate } from "@/lib/hooks/use-email-templates";
import { ArrowUp, ArrowDown, Edit2 } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;

interface GetColumnsProps {
    onEdit: (item: EmailTemplate) => void;
    currentSort: { key: string | null; direction: SortDirection };
    onSort: (key: string) => void;
}

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

export const SORTABLE_COLUMNS = {
    code: true,
    name: true,
    subject: true,
    updatedAt: true
};

export const getColumns = ({ onEdit, currentSort, onSort }: GetColumnsProps): ColumnDef<EmailTemplate>[] => [
    {
        accessorKey: "code",
        header: () => SORTABLE_COLUMNS.code
            ? <SortableHeader title="Código" sortKey="code" currentSort={currentSort} onSort={onSort} />
            : "Código",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>
    },
    {
        accessorKey: "name",
        header: () => SORTABLE_COLUMNS.name
            ? <SortableHeader title="Nombre" sortKey="name" currentSort={currentSort} onSort={onSort} />
            : "Nombre",
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="font-medium">{row.original.name}</span>
                <span className="text-xs text-muted-foreground">{row.original.description}</span>
            </div>
        )
    },
    {
        accessorKey: "subject",
        header: () => SORTABLE_COLUMNS.subject
            ? <SortableHeader title="Asunto" sortKey="subject" currentSort={currentSort} onSort={onSort} />
            : "Asunto",
    },
    {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
            return (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(row.original)}
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                </div>
            );
        },
    },
];
