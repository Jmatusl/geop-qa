"use client";

import { useMySessions, useRevokeMySession, useUserSessions, useRevokeUserSession } from "@/lib/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Monitor, Smartphone, Globe, ShieldAlert } from "lucide-react";
import { UAParser } from "ua-parser-js";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SessionListProps {
    isAdminView?: boolean;
    targetUserId?: string; // Only needed if admin view
}

export function SessionList({ isAdminView = false, targetUserId }: SessionListProps) {
    // NOTA: Llamamos a ambos hooks siempre para respetar las reglas de React Hooks. 
    // Usamos las props para decidir qué resultado utilizar.
    const mySessionsQuery = useMySessions();
    const userSessionsQuery = useUserSessions(targetUserId || "");

    const revokeMySession = useRevokeMySession();
    const revokeUserSession = useRevokeUserSession();

    const query = isAdminView ? userSessionsQuery : mySessionsQuery;
    const sessions = query.data;
    const isLoading = query.isLoading;
    const isPending = isAdminView ? revokeUserSession.isPending : revokeMySession.isPending;

    const handleRevoke = (sessionId: string) => {
        if (isAdminView && targetUserId) {
            revokeUserSession.mutate({ userId: targetUserId, sessionId, type: 'single' });
        } else {
            revokeMySession.mutate({ sessionId, type: 'single' });
        }
    };

    const handleRevokeOthersOrAll = () => {
        if (isAdminView && targetUserId) {
            revokeUserSession.mutate({ userId: targetUserId, type: 'all' });
        } else {
            revokeMySession.mutate({ type: 'others' });
        }
    };

    if (isLoading) return <div className="p-4 text-center text-sm text-muted-foreground">Cargando sesiones...</div>;

    if (!sessions || sessions.length === 0) {
        return (
            <div className="p-8 text-center border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <p className="text-muted-foreground">No hay sesiones activas (curioso, deberías ver esta).</p>
            </div>
        );
    }

    return (
        <Card className="border-red-100 dark:border-red-900/30">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            {isAdminView ? "Sesiones del Usuario" : "Mis Sesiones Activas"}
                        </CardTitle>
                        <CardDescription>
                            {isAdminView
                                ? "Gestione los dispositivos conectados de este usuario."
                                : "Si no reconoces una sesión, ciérrala y cambia tu contraseña inmediatamente."}
                        </CardDescription>
                    </div>
                    {sessions.length > (isAdminView ? 0 : 1) && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="h-8">
                                    <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                                    {isAdminView ? "Cerrar TODAS" : "Cerrar las otras"}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {isAdminView
                                            ? "Esta acción cerrará sesión en TODOS los dispositivos del usuario, incluyendo el actual si está conectado."
                                            : "Se cerrarán todas las sesiones excepto la que estás usando ahora."}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleRevokeOthersOrAll} className="bg-red-600 hover:bg-red-700">
                                        Proceder
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {sessions.map((session: any) => {
                        const parser = new UAParser(session.userAgent);
                        const browser = parser.getBrowser();
                        const os = parser.getOS();
                        const device = parser.getDevice();

                        const isMobile = device.type === 'mobile' || device.type === 'tablet';
                        const deviceIcon = isMobile ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />;

                        return (
                            <div key={session.id} className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                <div className="flex gap-3">
                                    <div className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400">
                                        {deviceIcon}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm">
                                                {browser.name} en {os.name}
                                            </p>
                                            {session.isCurrent && (
                                                <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-[10px] h-5">Esta sesión</Badge>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1 mt-1">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Globe className="h-3 w-3" />
                                                <span>IP: {session.ipAddress || "Desconocida"}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Activo {formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true, locale: es })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {!session.isCurrent && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isPending}
                                        onClick={() => handleRevoke(session.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/30"
                                    >
                                        Revocar
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
