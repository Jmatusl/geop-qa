"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, Shield, Settings, Menu, Trash2, ArrowRight, Mail, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMenuTree } from "@/lib/hooks/use-menus";
import { Skeleton } from "@/components/ui/skeleton";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";

export default function MantenedoresPage() {
    const { dashboard: texts, common } = maintenanceConfig;

    // Mapeo dinámico de descripciones y títulos desde el JSON
    const MANTENEDORES_OPTIONS = [
        {
            title: maintenanceConfig.usuarios.header.title,
            description: maintenanceConfig.usuarios.header.description,
            href: "/mantenedores/usuarios",
            icon: Users,
            color: "text-blue-600",
            bgColor: "bg-blue-50 dark:bg-blue-900/20",
        },
        {
            title: maintenanceConfig.roles.header.title,
            description: maintenanceConfig.roles.header.description,
            href: "/mantenedores/roles",
            icon: Shield,
            color: "text-indigo-600",
            bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
        },
        {
            title: maintenanceConfig.menus.header.title,
            description: maintenanceConfig.menus.header.description,
            href: "/mantenedores/menus",
            icon: Menu,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
        },
        {
            title: maintenanceConfig.configuraciones.header.title,
            description: maintenanceConfig.configuraciones.header.description,
            href: "/mantenedores/configuraciones",
            icon: Settings,
            color: "text-orange-600",
            bgColor: "bg-orange-50 dark:bg-orange-900/20",
        },
        {
            title: maintenanceConfig.motivos_baja.header.title,
            description: maintenanceConfig.motivos_baja.header.description,
            href: "/mantenedores/motivos-baja",
            icon: Trash2,
            color: "text-rose-600",
            bgColor: "bg-rose-50 dark:bg-rose-900/20",
        },
        {
            title: maintenanceConfig.motivos_baja_certificaciones.header.title,
            description: maintenanceConfig.motivos_baja_certificaciones.header.description,
            href: "/mantenedores/motivos-baja-certificaciones",
            icon: Trash2,
            color: "text-pink-600",
            bgColor: "bg-pink-50 dark:bg-pink-900/20",
        },
        {
            title: maintenanceConfig.temas.header.title,
            description: maintenanceConfig.temas.header.description,
            href: "/mantenedores/temas",
            icon: Palette,
            color: "text-purple-600",
            bgColor: "bg-purple-50 dark:bg-purple-900/20",
        },
        {
            title: maintenanceConfig.email_templates.header.title,
            description: maintenanceConfig.email_templates.header.description,
            href: "/mantenedores/email-templates",
            icon: Mail,
            color: "text-cyan-600",
            bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
        },
    ];

    // 1. Obtener árbol de menús filtrado por permisos
    const { data: menuTree, isLoading } = useMenuTree(true);

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div>
                    <Skeleton className="h-10 w-48 mb-2" />
                    <Skeleton className="h-5 w-96" />
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-48 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    const getAllAllowedPaths = (nodes: any[]): string[] => {
        let paths: string[] = [];
        nodes.forEach((node) => {
            if (node.path) paths.push(node.path);
            if (node.children && node.children.length > 0) {
                paths = [...paths, ...getAllAllowedPaths(node.children)];
            }
        });
        return paths;
    };

    const allowedPaths = menuTree ? getAllAllowedPaths(menuTree) : [];

    // 3. Filtrar las opciones estáticas
    const filteredOptions = MANTENEDORES_OPTIONS.filter((option) =>
        allowedPaths.includes(option.href)
    );

    if (filteredOptions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                    <Shield className="h-12 w-12 text-slate-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {common.restricted_access}
                </h2>
                <p className="text-muted-foreground max-w-sm">
                    {common.restricted_access_desc}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    {texts.header.title}
                </h1>
                <p className="text-muted-foreground mt-2 max-w-2xl">
                    {texts.header.description}
                </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOptions.map((option) => (
                    <Link key={option.href} href={option.href} className="group">
                        <Card className="h-full border-slate-200 dark:border-slate-800 transition-all hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-1">
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                <div className={cn("p-2.5 rounded-xl transition-colors", option.bgColor)}>
                                    <option.icon className={cn("h-6 w-6", option.color)} />
                                </div>
                                <div className="space-y-0.5">
                                    <CardTitle className="text-lg group-hover:text-[#283c7f] transition-colors dark:group-hover:text-blue-400">
                                        {option.title}
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-sm leading-relaxed mb-4">
                                    {option.description}
                                </CardDescription>
                                <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-[#283c7f] dark:text-blue-400">
                                    {common.explore} <ArrowRight className="ml-1.5 h-3 w-3 transition-transform group-hover:translate-x-1" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
