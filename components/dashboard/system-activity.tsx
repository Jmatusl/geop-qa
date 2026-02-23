"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Activity, UserPlus, LogIn } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface SystemActivityProps {
    data?: any;
    isLoading?: boolean;
    maxItems?: number;
}

export function SystemActivity({ data, isLoading, maxItems = 10 }: SystemActivityProps) {
    const getEventIcon = (type: string) => {
        switch (type) {
            case "LOGIN": return LogIn;
            case "CREATE_USER": return UserPlus;
            default: return Activity;
        }
    };

    const activities = data?.recentActivity?.slice(0, maxItems) || [];

    return (
        <Card className="border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
            <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        Actividad Reciente del Sistema
                    </CardTitle>
                    <CardDescription>
                        Últimos eventos globales registrados.
                    </CardDescription>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = '/auditoria'}
                    className="flex-shrink-0"
                >
                    Ver todo
                </Button>
            </CardHeader>
            <CardContent className="overflow-hidden">
                {isLoading ? (
                    <div className="space-y-4">
                        {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : activities.length ? (
                    <div className="max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <div className="space-y-6">
                            {activities.map((log: any) => {
                                const Icon = getEventIcon(log.eventType);
                                return (
                                    <div key={log.id} className="flex items-start gap-4">
                                        <div className="mt-1 bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
                                            <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {log.user?.firstName} {log.user?.lastName}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Ejecutó {log.eventType} en {log.module || "General"}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                vía IP: {log.ipAddress}
                                            </p>
                                        </div>
                                        <div className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Activity className="h-12 w-12 text-slate-200 dark:text-slate-800 mb-4" />
                        <p className="text-muted-foreground">No hay actividad reciente registrada.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
