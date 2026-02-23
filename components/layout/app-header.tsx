"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-provider";
import { ModeToggle } from "@/components/mode-toggle";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

import { Breadcrumbs } from "./breadcrumbs";

export function AppHeader() {
    const { toggle, config } = useSidebar();
    const { theme } = useTheme();

    return (
        <header
            className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b px-6 shadow-sm text-white transition-colors duration-300"
            style={{ backgroundColor: 'var(--header-bg, #283c7f)' }}
        >
            <Button
                variant="ghost"
                size="icon"
                className="lg:hidden mr-2 text-white hover:bg-white/10 hover:text-white"
                onClick={toggle}
            >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Menu</span>
            </Button>

            <div className="flex flex-1 items-center gap-6">
                {/* Título del Sistema y Versión (Siempre visibles) */}
                <div className="flex flex-col leading-none">
                    <h1 className="text-lg font-bold tracking-tight">{config.title}</h1>
                    <span className="text-[10px] text-white/70 font-mono mt-0.5">v{config.version}</span>
                </div>

                <div className="h-6 w-px bg-white/20 hidden md:block" />

                {config.showBreadcrumb && config.container === 'header' && (
                    <Breadcrumbs light className="hidden md:block" />
                )}
            </div>

            <div className="flex items-center gap-2">
                {config.dark_mode_enable && (
                    <ModeToggle className="text-white hover:bg-white/10 hover:text-white" />
                )}
            </div>
        </header>
    );
}
