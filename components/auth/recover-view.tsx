"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthShell } from './auth-shell';
import uiConfigFallback from '@/lib/config/ui-config-fallback.json';

interface RecoverViewProps {
    config?: any | null;
}

export function RecoverView({ config }: RecoverViewProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Deep merge with fallback
    const fullConfig = {
        ...uiConfigFallback,
        ...(config || {}),
        recover_page: {
            ...uiConfigFallback.recover_page,
            ...(config?.recover_page || {}),
        }
    };

    const rp = fullConfig.recover_page;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/v1/auth/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                setSuccess(true);
                toast.success('Solicitud procesada correctamente');
            } else {
                const data = await response.json();
                toast.error(data.error || 'Error al procesar solicitud');
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
                            <CardTitle className="text-xl font-bold">{rp.success_titulo}</CardTitle>
                            <CardDescription className="pt-2">
                                Si el correo <strong>{email}</strong> {rp.success_subtitulo.split('Si el correo está registrado, ')[1] || rp.success_subtitulo}
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="flex justify-center pt-4">
                            <Link href="/login">
                                <Button variant="outline" className="gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    {rp.btn_back_to_login}
                                </Button>
                            </Link>
                        </CardFooter>
                    </>
                ) : (
                    <>
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-xl font-bold text-center">{rp.titulo}</CardTitle>
                            <CardDescription className="text-center">
                                {rp.subtitulo}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">{rp.label_email}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={rp.placeholder_email}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="off"
                                        disabled={loading}
                                        className="bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-[#283c7f] hover:bg-[#1f2f65] text-white font-semibold h-11"
                                    disabled={loading}
                                >
                                    {loading ? rp.btn_loading : rp.btn_recover}
                                </Button>
                            </form>
                        </CardContent>
                        <CardFooter className="flex justify-center border-t p-4 mt-2">
                            <Link
                                href="/login"
                                className="text-sm text-slate-500 hover:text-[#283c7f] flex items-center gap-2 transition-colors dark:text-slate-400 dark:hover:text-slate-200"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {rp.btn_back_to_login}
                            </Link>
                        </CardFooter>
                    </>
                )}
            </Card>
        </AuthShell>
    );
}
