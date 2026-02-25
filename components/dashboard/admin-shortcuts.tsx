"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

interface Link {
  label: string;
  path: string;
}

interface AdminShortcutsProps {
  links?: Link[];
}

const defaultLinks: Link[] = [
  { label: "Gestionar Usuarios", path: "/mantenedores/usuarios" },
  { label: "Configurar Menús", path: "/mantenedores/menus" },
];

export function AdminShortcuts({ links = defaultLinks }: AdminShortcutsProps) {
  return (
    <Card className="border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-linear-to-br from-[#283c7f] to-[#1e2d5f] text-white overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Accesos Directos</CardTitle>
        <CardDescription className="text-indigo-100/70">Tareas comunes de administración</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {links.map((link) => (
            <a key={link.path} href={link.path} className="group flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
              <span className="text-sm font-medium">{link.label}</span>
              <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
