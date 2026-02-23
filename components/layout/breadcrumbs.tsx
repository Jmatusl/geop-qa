"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

interface BreadcrumbsProps {
    className?: string;
    light?: boolean;
}

export function Breadcrumbs({ className, light = false }: BreadcrumbsProps) {
    const pathname = usePathname();

    const generateBreadcrumbs = () => {
        const pathWithoutQuery = pathname.split("?")[0];
        const paths = pathWithoutQuery.split('/').filter(Boolean);

        return paths.map((path, index) => {
            const href = `/${paths.slice(0, index + 1).join('/')}`;
            const isLast = index === paths.length - 1;

            const title = path
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            return { href, title, isLast };
        });
    };

    const breadcrumbs = generateBreadcrumbs();

    if (breadcrumbs.length === 0 || (breadcrumbs.length === 1 && breadcrumbs[0].title === "Dashboard")) {
        return null;
    }

    return (
        <Breadcrumb className={className}>
            <BreadcrumbList className={cn(light ? "text-white/80" : "text-muted-foreground")}>
                <BreadcrumbItem>
                    <BreadcrumbLink
                        href="/dashboard"
                        className={cn(light ? "text-white/80 hover:text-white" : "hover:text-foreground")}
                    >
                        Dashboard
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className={cn(light ? "text-white/60" : "text-muted-foreground/60")} />

                {breadcrumbs.map((crumb, index) => {
                    if (crumb.title === "Dashboard") return null;

                    return (
                        <React.Fragment key={crumb.href}>
                            <BreadcrumbItem>
                                {crumb.isLast ? (
                                    <BreadcrumbPage className={cn(light ? "text-white font-medium" : "font-medium text-foreground")}>
                                        {crumb.title}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink
                                        href={crumb.href}
                                        className={cn(light ? "text-white/80 hover:text-white" : "hover:text-foreground")}
                                    >
                                        {crumb.title}
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!crumb.isLast && <BreadcrumbSeparator className={cn(light ? "text-white/60" : "text-muted-foreground/60")} />}
                        </React.Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
