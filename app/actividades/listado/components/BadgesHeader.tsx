"use client";

import { Badge } from "@/components/ui/badge";

interface BadgesHeaderProps {
  permissions: {
    autoriza: boolean;
    chequea: boolean;
    revisa: boolean;
    recepciona: boolean;
  };
}

export function BadgesHeader({ permissions }: BadgesHeaderProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <Badge
        variant="secondary"
        className={`${
          permissions.autoriza
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-slate-100 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500"
        } border-none font-medium text-[10px] px-2 py-0.5`}
      >
        Autoriza: {permissions.autoriza ? "Sí" : "No"}
      </Badge>

      <Badge
        variant="secondary"
        className={`${
          permissions.chequea
            ? "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
            : "bg-slate-100 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500"
        } border-none font-medium text-[10px] px-2 py-0.5`}
      >
        Chequea: {permissions.chequea ? "Sí" : "No"}
      </Badge>

      <Badge
        variant="secondary"
        className={`${
          permissions.revisa
            ? "bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400"
            : "bg-slate-100 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500"
        } border-none font-medium text-[10px] px-2 py-0.5`}
      >
        Revisa: {permissions.revisa ? "Sí" : "No"}
      </Badge>

      <Badge
        variant="secondary"
        className={`${
          permissions.recepciona
            ? "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
            : "bg-slate-100 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500"
        } border-none font-medium text-[10px] px-2 py-0.5`}
      >
        Recepción: {permissions.recepciona ? "Sí" : "No"}
      </Badge>
    </div>
  );
}
