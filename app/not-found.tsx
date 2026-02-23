"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Iluminación de fondo */}
                <div className="relative">
                    <div className="absolute -top-12 -left-12 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl animate-pulse" />
                    <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl animate-pulse delay-700" />

                    <div className="relative flex justify-center">
                        <div className="h-24 w-24 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform duration-500 group">
                            <Search className="h-12 w-12 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-7xl font-black text-slate-900 dark:text-white tracking-tighter">
                        404
                    </h1>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                        Página No Encontrada
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                        Lo sentimos, la página que estás buscando no existe o ha sido movida.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <Button
                        variant="outline"
                        className="w-full sm:w-auto gap-2 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 shadow-sm"
                        onClick={() => window.history.back()}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver atrás
                    </Button>
                    <Link href="/" className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto bg-[#283c7f] hover:bg-[#1f2f65] text-white gap-2 shadow-lg shadow-blue-900/10 transition-all active:scale-95">
                            <Home className="h-4 w-4" />
                            Ir al inicio
                        </Button>
                    </Link>
                </div>

                <div className="pt-8 border-t border-slate-200 dark:border-slate-900">
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                        SOTEX
                    </p>
                </div>
            </div>
        </div>
    );
}
