import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  name: string;
  colorHex?: string | null;
  className?: string;
}

const PRIORITY_CLASSES: Record<string, string> = {
  "#9CA3AF": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200",
  "#F59E0B": "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200",
  "#EF4444": "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200",
  "#B91C1C": "bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-300 border-red-300 font-extrabold",
};

export function PriorityBadge({ name, colorHex, className }: PriorityBadgeProps) {
  const cls = colorHex ? (PRIORITY_CLASSES[colorHex] ?? "bg-slate-100 text-slate-600 border-slate-200") : "bg-slate-100 text-slate-600 border-slate-200";

  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wide whitespace-nowrap", cls, className)}>{name}</span>;
}
