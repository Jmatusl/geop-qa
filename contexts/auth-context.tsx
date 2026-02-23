"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    avatarUrl: string | null;
    avatarFile: string | null;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (userData: User) => void;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    clearCache: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const queryClient = useQueryClient();

    const refreshUser = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    const login = (userData: User) => {
        setUser(userData);
    };

    const logout = async () => {
        try {
            const res = await fetch('/api/v1/auth/logout', { method: 'POST' });
            if (res.ok) {
                // Limpiar TODA la caché de React Query antes de cambiar de usuario
                queryClient.clear();
                setUser(null);
                toast.success('Sesión cerrada correctamente');
                router.push('/login');
            } else {
                toast.error('Error al cerrar sesión');
            }
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Error de red al cerrar sesión');
        }
    };

    const clearCache = useCallback(() => {
        // Método expuesto para limpiar caché manualmente (ej: después de login exitoso)
        queryClient.clear();
    }, [queryClient]);

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            logout,
            refreshUser,
            clearCache
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
