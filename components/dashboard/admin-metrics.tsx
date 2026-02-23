"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShieldCheck, Activity, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle } from "lucide-react";

interface AdminMetricsProps {
    data?: any;
    variant?: "full" | "limited";
}

export function AdminMetrics({ data, variant = "full" }: AdminMetricsProps) {
    const [isCronLoading, setIsCronLoading] = useState(false);

    const handleRunCron = async () => {
        setIsCronLoading(true);
        try {
            const response = await fetch("/api/v1/admin/trigger-cron", { method: "POST" });
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || "Error al ejecutar cron");

            toast.success("Proceso completado", {
                description: `Actualizados: ${result.statusUpdates} | Notificaciones: ${result.userNotificationsEnqueued} | Digest: ${result.adminDigestRecipients}`
            });
        } catch (error: any) {
            toast.error("Error en ejecución manual", { description: error.message });
        } finally {
            setIsCronLoading(false);
        }
    };

    const metrics = [
        {
            id: "users",
            title: "Usuarios Activos",
            value: data?.metrics?.users ?? 0,
            icon: Users,
            description: "Registrados en el sistema",
            show: true,
        },
        {
            id: "roles",
            title: "Roles",
            value: data?.metrics?.roles ?? 0,
            icon: ShieldCheck,
            description: "Configurados actualmente",
            show: variant === "full",
        },
        {
            id: "sessions",
            title: "Sesiones",
            value: data?.metrics?.sessions ?? 0,
            icon: Activity,
            description: "Concurrentes ahora mismo",
            clickable: true,
            show: true,
        },
        {
            id: "alerts",
            title: "Alertas",
            value: data?.metrics?.alerts ?? 0, // Ajustado si data trae alertas
            icon: AlertCircle,
            description: "Eventos críticos detectados",
            show: variant === "full",
            action: (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-auto hover:bg-slate-200 dark:hover:bg-slate-700"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRunCron();
                    }}
                    disabled={isCronLoading}
                    title="Ejecutar Cron Manualmente"
                >
                    {isCronLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : <PlayCircle className="h-4 w-4 text-indigo-500" />}
                </Button>
            )
        },
    ].filter(m => m.show);

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => {
                const CardContentWrapper = (
                    <Card className={cn(
                        "overflow-hidden border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 transition-all",
                        metric.clickable && "hover:ring-indigo-500 cursor-pointer group"
                    )}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                                {metric.action}
                            </div>
                            <div className={cn(
                                "p-2 rounded-lg transition-colors bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
                                metric.clickable && "group-hover:bg-indigo-500 group-hover:text-white"
                            )}>
                                <metric.icon className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold tracking-tight">{metric.value}</div>
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-muted-foreground">
                                    {metric.description}
                                </p>
                                {metric.clickable && (
                                    <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Ver detalle
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );

                if (metric.id === "sessions" && metric.clickable) {
                    return (
                        <Dialog key={metric.id}>
                            <DialogTrigger asChild>
                                {CardContentWrapper}
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Sesiones Activas</DialogTitle>
                                    <DialogDescription>
                                        Listado de sesiones concurrentes que no han expirado aún.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                    {data?.activeSessions?.map((session: any) => (
                                        <div key={session.id} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={session.user?.avatarUrl} />
                                                <AvatarFallback>{session.user?.firstName?.[0]}{session.user?.lastName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate">
                                                    {session.user?.firstName} {session.user?.lastName}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {session.user?.email}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                                                        IP: {session.ipAddress || "Desconocida"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-medium text-slate-400">Última actividad</p>
                                                <p className="text-xs font-semibold">
                                                    {formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true, locale: es })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </DialogContent>
                        </Dialog>
                    );
                }

                return <div key={metric.id}>{CardContentWrapper}</div>;
            })}
        </div>
    );
}
