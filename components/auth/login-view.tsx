"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Monitor, Smartphone, Globe, ShieldAlert, XCircle } from 'lucide-react';
import { AuthShell } from './auth-shell';
import uiConfigFallback from '@/lib/config/ui-config-fallback.json';
import { useAuth } from '@/lib/hooks/use-auth';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LoginViewProps {
    config?: any | null;
}

const loginSchema = z.object({
    email: z.string().min(1, "El correo es obligatorio").email("Ingrese un correo válido"),
    password: z.string().min(1, "La contraseña es obligatoria"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginView({ config }: LoginViewProps) {
    const router = useRouter();
    const { clearCache, login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Estados para Limite de Sesiones
    const [sessionLimitOpen, setSessionLimitOpen] = useState(false);
    const [activeSessions, setActiveSessions] = useState<any[]>([]);
    const [pendingValues, setPendingValues] = useState<LoginFormValues | null>(null);

    // Deep merge with fallback
    const fullConfig = {
        ...uiConfigFallback,
        ...(config || {}),
        login_page: {
            ...uiConfigFallback.login_page,
            ...(config?.login_page || {}),
        }
    };

    const lp = fullConfig.login_page;

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (values: LoginFormValues) => {
        setLoading(true);

        try {
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            const data = await response.json();

            if (!response.ok) {
                // Manejo de errores específicos
                if (data.code === 'SESSION_LIMIT_REACHED') {
                    setActiveSessions(data.sessions || []);
                    setPendingValues(values);
                    setSessionLimitOpen(true);
                    toast.info(data.error);
                } else if (data.code === 'LOCKOUT_WARNING') {
                    toast.warning(data.error, { duration: 6000 });
                } else if (data.code === 'ACCOUNT_LOCKED' || data.code === 'ACCOUNT_LOCKED_NOW') {
                    toast.error(data.error, {
                        icon: <XCircle className="text-red-500" />,
                        duration: 8000
                    });
                } else {
                    toast.error(data.error || 'Error al iniciar sesión');
                }
                return;
            }

            // Limpiar caché de queries ANTES de navegar al dashboard
            clearCache();

            // ACTUALIZACIÓN CRÍTICA: Actualizar el estado global del usuario en el AuthContext
            // Esto evita que el Dashboard se renderice con datos nulos o del usuario anterior
            if (data.user) {
                login(data.user);
            }

            toast.success('¡Bienvenido!');

            // Forzar refresh para obtener datos frescos del servidor
            router.refresh();

            if (data.mustChangePassword) {
                router.push('/dashboard?mustChange=true');
            } else {
                router.push('/dashboard');
            }
        } catch (error) {
            toast.error('Error al conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleKillSession = async (sessionId: string | null = null, killAll = false) => {
        if (!pendingValues) return;

        setLoading(true);
        try {
            const res = await fetch('/api/v1/auth/sessions/kill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: pendingValues.email,
                    password: pendingValues.password,
                    sessionId,
                    killAll
                }),
            });

            if (res.ok) {
                toast.success('Sesiones cerradas. Intentando ingresar...');
                setSessionLimitOpen(false);
                await onSubmit(pendingValues);
            } else {
                const err = await res.json();
                toast.error(err.error || 'Error al cerrar sesiones');
            }
        } catch (error) {
            toast.error('Error de comunicación');
        } finally {
            setLoading(false);
        }
    }

    const getDeviceIcon = (userAgent: string) => {
        const ua = userAgent.toLowerCase();
        if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) return <Smartphone className="h-4 w-4" />;
        if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) return <Monitor className="h-4 w-4" />;
        return <Globe className="h-4 w-4" />;
    };

    return (
        <AuthShell config={config}>
            <Card className="w-full max-w-md shadow-2xl border-slate-300 dark:border-slate-700 z-10 overflow-hidden">
                <CardHeader className="space-y-1 pb-2 relative">
                    <CardTitle className="text-2xl text-center font-bold text-slate-800 dark:text-slate-100">
                        {lp.form_login.titulo}
                    </CardTitle>
                    <CardDescription className="text-center text-slate-500 dark:text-slate-400">
                        {lp.form_login.subtitulo}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{lp.form_login.label_login}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="email"
                                                placeholder={lp.form_login.placeholder_login}
                                                autoComplete="off"
                                                disabled={loading}
                                                className="bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700"
                                                onFocus={(e) => {
                                                    // Evitar que el teclado oculte el input en móviles
                                                    setTimeout(() => {
                                                        e.target.scrollIntoView({ behavior: "smooth", block: "center" });
                                                    }, 300);
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel>{lp.form_login.label_password}</FormLabel>
                                            <a href="/recover" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400" tabIndex={-1}>
                                                {lp.form_login.olvidar_contrasena}
                                            </a>
                                        </div>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    {...field}
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder={lp.form_login.placeholder_password}
                                                    autoComplete="off"
                                                    disabled={loading}
                                                    className="bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700 pr-10"
                                                />
                                                {lp.form_login.mostrar_ocultar_password && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                        tabIndex={-1}
                                                    >
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        <span className="sr-only">
                                                            {showPassword ? lp.form_login.ocultar_password : lp.form_login.mostrar_password}
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full bg-[#283c7f] hover:bg-[#1f2f65] text-white font-semibold h-11 mt-2 transition-all active:scale-[0.98]"
                                disabled={loading}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? lp.form_login.btn_loading : lp.form_login.btn_login}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Modal de Sesiones Concurrentes */}
            <Dialog open={sessionLimitOpen} onOpenChange={setSessionLimitOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-amber-500" />
                            Límite de sesiones alcanzado
                        </DialogTitle>
                        <DialogDescription>
                            Para poder ingresar, debes cerrar al menos una de tus sesiones activas.
                            Selecciona una para cerrar o cierra todas las anteriores.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead>Dispositivo / IP</TableHead>
                                    <TableHead>Última actividad</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeSessions.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell>{getDeviceIcon(session.userAgent || '')}</TableCell>
                                        <TableCell className="text-sm">
                                            <div className="font-medium truncate max-w-[150px]" title={session.userAgent}>
                                                {session.userAgent ? (session.userAgent.includes('Windows') ? 'PC Windows' : session.userAgent.includes('iPhone') ? 'iPhone' : 'Dispositivo') : 'Desconocido'}
                                            </div>
                                            <div className="text-xs text-slate-500">{session.ipAddress || 'Sin IP'}</div>
                                        </TableCell>
                                        <TableCell className="text-xs italic text-slate-500">
                                            {formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true, locale: es })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-xs h-7"
                                                onClick={() => handleKillSession(session.id)}
                                                disabled={loading}
                                            >
                                                Cerrar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setSessionLimitOpen(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleKillSession(null, true)}
                            disabled={loading}
                        >
                            Cerrar todas las demás
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthShell>
    );
}
