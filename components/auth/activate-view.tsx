"use client";


import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import { AuthShell } from './auth-shell';
import uiConfigFallback from '@/lib/config/ui-config-fallback.json';

interface ActivateViewProps {
    token: string;
    config?: any | null;
}

export function ActivateView({ token, config }: ActivateViewProps) {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Deep merge with fallback
    const fullConfig = {
        ...uiConfigFallback,
        ...(config || {}),
        activate_page: {
            ...uiConfigFallback.activate_page,
            ...(config?.activate_page || {}),
        }
    };

    const ap = fullConfig.activate_page;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 8) {
            toast.error('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/v1/auth/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password, confirmPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                toast.success('Cuenta activada correctamente');
                setTimeout(() => router.push('/login'), 3000);
            } else {
                toast.error(data.error || 'Error al activar cuenta');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell config={config}>
            <Card className="w-full max-w-md shadow-2xl border-slate-300 dark:border-slate-700 z-10">
                {success ? (
                    <>
                        <CardHeader className="text-center pb-2">
                            <div className="flex justify-center mb-4">
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center dark:bg-green-900/30">
                                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <CardTitle className="text-xl font-bold">¡Cuenta Activada!</CardTitle>
                            <CardDescription className="pt-2">
                                Tu cuenta ha sido activada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="flex justify-center pt-4">
                            <Link href="/login" className="w-full">
                                <Button className="w-full bg-[#283c7f] hover:bg-[#1f2f65] gap-2">
                                    Ir al Inicio de Sesión
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </CardFooter>
                    </>
                ) : (
                    <>
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-xl font-bold text-center">{ap.titulo}</CardTitle>
                            <CardDescription className="text-center">
                                {ap.subtitulo}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Nueva Contraseña</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Mínimo 8 caracteres"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoComplete="off"
                                            disabled={loading}
                                            className="bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Repite la contraseña"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            autoComplete="off"
                                            disabled={loading}
                                            className="bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                            tabIndex={-1}
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-[#283c7f] hover:bg-[#1f2f65] text-white font-semibold h-11 mt-2"
                                    disabled={loading}
                                >
                                    {loading ? 'Activando...' : 'Activar Cuenta'}
                                </Button>
                            </form>
                        </CardContent>
                    </>
                )}
            </Card>
        </AuthShell>
    );
}
