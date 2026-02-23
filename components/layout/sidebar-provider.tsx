"use client"

import * as React from "react"
import { useSettings } from "@/lib/hooks/use-settings"
import uiConfigFallback from "@/lib/config/ui-config-fallback.json"

export interface UIConfig {
    title: string;
    description: string;
    version: string;
    dark_mode_enable: boolean;
    showBreadcrumb: boolean;
    container: 'header' | 'main';
    header_color: string;
    primary_color: string;
    aside: {
        max_width_class: string;
        min_width_class: string;
        show_tooltip: boolean;
        show_popup: boolean;
    };
    isotipo: {
        show: boolean;
        width_class: string;
        height_class: string;
        margin_top_class: string;
        height_container: string;
        dark_mode: { image: string; sourceType: "url" | "base64"; base64?: string };
        light_mode: { image: string; sourceType: "url" | "base64"; base64?: string };
    };
    logo: {
        width_class: string;
        height_class: string;
        margin_top_class: string;
        height_container: string;
        dark_mode: { image: string; sourceType: "url" | "base64"; base64?: string };
        light_mode: { image: string; sourceType: "url" | "base64"; base64?: string };
    };
    logo_cliente: {
        width_class: string;
        height_class: string;
        margin_top_class: string;
        height_container: string;
        dark_mode: { image: string; sourceType: "url" | "base64"; base64?: string };
        light_mode: { image: string; sourceType: "url" | "base64"; base64?: string };
    };
    login_page: {
        titulo_sistema: {
            texto: string;
            estilo: string;
            modo_claro: string;
            modo_oscuro: string;
        };
        subtitulo_sistema: {
            texto: string;
            estilo: string;
            modo_claro: string;
            modo_oscuro: string;
        };
        form_login: {
            titulo: string;
            subtitulo: string;
            label_login: string;
            placeholder_login: string;
            label_password: string;
            placeholder_password: string;
            mostrar_ocultar_password: boolean;
            mostrar_password: string;
            ocultar_password: string;
            btn_login: string;
            olvidar_contrasena: string;
        };
        configuracion_logos: {
            logo_izquierdo: {
                visible: boolean;
                width_class: string;
                height_class: string;
                margin_top_class: string;
                height_container: string;
                light_mode: { image: string; sourceType: "url" | "base64"; base64?: string };
                dark_mode: { image: string; sourceType: "url" | "base64"; base64?: string };
            };
            logo_derecho: {
                visible: boolean;
                width_class: string;
                height_class: string;
                margin_top_class: string;
                height_container: string;
                light_mode: { image: string; sourceType: "url" | "base64"; base64?: string };
                dark_mode: { image: string; sourceType: "url" | "base64"; base64?: string };
            };
        };
    };
}

const SidebarContext = React.createContext<{
    expanded: boolean;
    setExpanded: (expanded: boolean) => void;
    toggle: () => void;
    isMobile: boolean;
    config: UIConfig;
}>({
    expanded: true,
    setExpanded: () => { },
    toggle: () => { },
    isMobile: false,
    config: uiConfigFallback as UIConfig,
})

export function useSidebar() {
    const context = React.useContext(SidebarContext)
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider")
    }
    return context
}

export function SidebarProvider({
    children,
    config
}: {
    children: React.ReactNode,
    config: UIConfig
}) {
    const [expanded, setExpanded] = React.useState(true)
    const [isMobile, setIsMobile] = React.useState(false)

    React.useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile)
            // On mobile start collapsed, on desktop start expanded
            setExpanded(!mobile)
        }

        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    // Inject CSS variables for colors if they change
    React.useEffect(() => {
        if (config) {
            document.documentElement.style.setProperty('--header-bg', config.header_color);
            document.documentElement.style.setProperty('--primary-color', config.primary_color);
            document.documentElement.style.setProperty('--aside-max-width', config.aside.max_width_class === 'w-64' ? '16rem' : '15.625rem');
        }
    }, [config]);

    const toggle = React.useCallback(() => {
        setExpanded((prev) => !prev)
    }, [])

    return (
        <SidebarContext.Provider value={{ expanded, setExpanded, toggle, isMobile, config }}>
            {children}
        </SidebarContext.Provider>
    )
}
