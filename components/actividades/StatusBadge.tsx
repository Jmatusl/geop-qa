import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  name: string;
  colorHex?: string | null;
  code?: string;
  className?: string;
}

/** Mapa de variantes de color para estados conocidos */
const COLOR_MAP: Record<string, string> = {
  "#9CA3AF": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  "#F97316": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  "#3B82F6": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  "#22C55E": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
  "#EF4444": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
  "#F59E0B": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  "#B91C1C": "bg-red-200 text-red-900 dark:bg-red-950/50 dark:text-red-300 border-red-300 dark:border-red-900",
};

export function StatusBadge({ name, colorHex, className }: StatusBadgeProps) {
  const colorClass = colorHex ? (COLOR_MAP[colorHex] ?? "bg-slate-100 text-slate-700 border-slate-200") : "bg-slate-100 text-slate-700 border-slate-200";

  return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap", colorClass, className)}>{name}</span>;
}
