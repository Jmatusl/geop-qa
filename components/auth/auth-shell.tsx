"use client";

import Image from "next/image";
import uiConfigFallback from "@/lib/config/ui-config-fallback.json";
import React from "react";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  children: React.ReactNode;
  config?: any | null;
}

export function AuthShell({ children, config }: AuthShellProps) {
  // Deep merge with fallback
  const fullConfig = {
    ...uiConfigFallback,
    ...(config || {}),
    login_page: {
      ...uiConfigFallback.login_page,
      ...(config?.login_page || {}),
      titulo_sistema: { ...uiConfigFallback.login_page.titulo_sistema, ...(config?.login_page?.titulo_sistema || {}) },
      subtitulo_sistema: { ...uiConfigFallback.login_page.subtitulo_sistema, ...(config?.login_page?.subtitulo_sistema || {}) },
      configuracion_logos: {
        ...uiConfigFallback.login_page.configuracion_logos,
        logo_izquierdo: {
          ...uiConfigFallback.login_page.configuracion_logos.logo_izquierdo,
          ...(config?.logo || {}),
          ...(config?.login_page?.configuracion_logos?.logo_izquierdo || {}),
          light_mode: {
            ...uiConfigFallback.login_page.configuracion_logos.logo_izquierdo.light_mode,
            ...(config?.logo?.light_mode || {}),
            ...(config?.login_page?.configuracion_logos?.logo_izquierdo?.light_mode || {}),
          },
          dark_mode: {
            ...uiConfigFallback.login_page.configuracion_logos.logo_izquierdo.dark_mode,
            ...(config?.logo?.dark_mode || {}),
            ...(config?.login_page?.configuracion_logos?.logo_izquierdo?.dark_mode || {}),
          },
        },
        logo_derecho: {
          ...uiConfigFallback.login_page.configuracion_logos.logo_derecho,
          ...(config?.logo_cliente || {}),
          ...(config?.login_page?.configuracion_logos?.logo_derecho || {}),
          light_mode: {
            ...uiConfigFallback.login_page.configuracion_logos.logo_derecho.light_mode,
            ...(config?.logo_cliente?.light_mode?.image || config?.logo_cliente?.light_mode?.base64 ? config.logo_cliente.light_mode : {}),
            ...(config?.login_page?.configuracion_logos?.logo_derecho?.light_mode?.image || config?.login_page?.configuracion_logos?.logo_derecho?.light_mode?.base64
              ? config.login_page.configuracion_logos.logo_derecho.light_mode
              : {}),
          },
          dark_mode: {
            ...uiConfigFallback.login_page.configuracion_logos.logo_derecho.dark_mode,
            ...(config?.logo_cliente?.dark_mode?.image || config?.logo_cliente?.dark_mode?.base64 ? config.logo_cliente.dark_mode : {}),
            ...(config?.login_page?.configuracion_logos?.logo_derecho?.dark_mode?.image || config?.login_page?.configuracion_logos?.logo_derecho?.dark_mode?.base64
              ? config.login_page.configuracion_logos.logo_derecho.dark_mode
              : {}),
          },
        },
      },
    },
  };

  const lp = fullConfig.login_page;

  const titleColorLight = lp.titulo_sistema.modo_claro || "#000000";
  const titleColorDark = lp.titulo_sistema.modo_oscuro || "#FFFFFF";
  const subtitleColorLight = lp.subtitulo_sistema.modo_claro || "#64748B";
  const subtitleColorDark = lp.subtitulo_sistema.modo_oscuro || "#94A3B8";

  const getSize = (val: string | number | undefined, defaultValue: number) => {
    if (!val) return defaultValue;
    const strVal = val.toString();
    if (strVal.includes("-") || strVal.includes(" ")) return undefined;
    const num = Number(val);
    return isNaN(num) ? defaultValue : num;
  };

  const getValClass = (val: any) => {
    if (!val) return "";
    const strVal = val.toString();
    return strVal.includes("-") || strVal.includes(" ") ? strVal : "";
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-2rem)] relative">
      <style jsx global>{`
        .dynamic-title {
          color: ${titleColorLight};
        }
        .dark .dynamic-title {
          color: ${titleColorDark};
        }
        .dynamic-subtitle {
          color: ${subtitleColorLight};
        }
        .dark .dynamic-subtitle {
          color: ${subtitleColorDark};
        }
      `}</style>

      {/* LOGO IZQUIERDO */}
      {lp.configuracion_logos.logo_izquierdo.visible && (
        <div
          style={{
            position: "fixed",
            top: parseInt(lp.configuracion_logos.logo_izquierdo.margin_top_class) || 24,
            left: parseInt(lp.configuracion_logos.logo_izquierdo.height_container) || 24,
            zIndex: 50,
          }}
          className="hidden md:flex items-center gap-3"
        >
          <div
            style={{
              position: "relative",
              width: getSize(lp.configuracion_logos.logo_izquierdo.width_class, 140),
              height: getSize(lp.configuracion_logos.logo_izquierdo.height_class, 60),
            }}
            className={cn(getValClass(lp.configuracion_logos.logo_izquierdo.width_class), getValClass(lp.configuracion_logos.logo_izquierdo.height_class))}
          >
            <img
              src={
                lp.configuracion_logos.logo_izquierdo.light_mode.sourceType === "base64"
                  ? lp.configuracion_logos.logo_izquierdo.light_mode.base64 || lp.configuracion_logos.logo_izquierdo.light_mode.image
                  : lp.configuracion_logos.logo_izquierdo.light_mode.image
              }
              alt="Logo Izquierdo"
              className="object-contain dark:hidden w-full h-full"
            />
            <img
              src={
                lp.configuracion_logos.logo_izquierdo.dark_mode.sourceType === "base64"
                  ? lp.configuracion_logos.logo_izquierdo.dark_mode.base64 || lp.configuracion_logos.logo_izquierdo.dark_mode.image
                  : lp.configuracion_logos.logo_izquierdo.dark_mode.image || lp.configuracion_logos.logo_izquierdo.light_mode.image
              }
              alt="Logo Izquierdo Dark"
              className="object-contain hidden dark:block w-full h-full"
            />
          </div>
        </div>
      )}

      {/* LOGO DERECHO */}
      {lp.configuracion_logos.logo_derecho.visible && (
        <div
          style={{
            position: "fixed",
            bottom:
              lp.configuracion_logos.logo_derecho.margin_top_class && lp.configuracion_logos.logo_derecho.margin_top_class.toString().includes("mt-")
                ? 24
                : parseInt(lp.configuracion_logos.logo_derecho.margin_top_class) || 24,
            right:
              lp.configuracion_logos.logo_derecho.height_container && lp.configuracion_logos.logo_derecho.height_container.toString().includes("h-")
                ? 24
                : parseInt(lp.configuracion_logos.logo_derecho.height_container) || 24,
            zIndex: 50,
          }}
          className="hidden md:block"
        >
          <div
            style={{
              position: "relative",
              width: getSize(lp.configuracion_logos.logo_derecho.width_class, 120),
              height: getSize(lp.configuracion_logos.logo_derecho.height_class, 48),
            }}
            className={cn(getValClass(lp.configuracion_logos.logo_derecho.width_class), getValClass(lp.configuracion_logos.logo_derecho.height_class))}
          >
            <img
              src={
                lp.configuracion_logos.logo_derecho.light_mode.sourceType === "base64"
                  ? lp.configuracion_logos.logo_derecho.light_mode.base64 || lp.configuracion_logos.logo_derecho.light_mode.image
                  : lp.configuracion_logos.logo_derecho.light_mode.image
              }
              alt="Logo Derecho"
              className="object-contain dark:hidden w-full h-full"
            />
            <img
              src={
                lp.configuracion_logos.logo_derecho.dark_mode.sourceType === "base64"
                  ? lp.configuracion_logos.logo_derecho.dark_mode.base64 || lp.configuracion_logos.logo_derecho.dark_mode.image
                  : lp.configuracion_logos.logo_derecho.dark_mode.image || lp.configuracion_logos.logo_derecho.light_mode.image
              }
              alt="Logo Derecho Dark"
              className="object-contain hidden dark:block w-full h-full"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col items-center mb-8 text-center space-y-2 z-10">
        {!lp.configuracion_logos.logo_izquierdo.visible && !lp.configuracion_logos.logo_derecho.visible && (
          <div className="mb-4">
            <Image src="/logo.svg" width={60} height={60} alt="Logo" className="dark:invert" />
          </div>
        )}

        <h1 className={`font-bold dynamic-title ${lp.titulo_sistema.estilo === "h1" ? "text-4xl" : lp.titulo_sistema.estilo === "h2" ? "text-3xl" : "text-2xl"}`}>{lp.titulo_sistema.texto}</h1>
        <p className={`dynamic-subtitle ${lp.subtitulo_sistema.estilo === "h5" ? "text-lg" : "text-base"}`}>{lp.subtitulo_sistema.texto}</p>
      </div>

      {children}

      {/* Mobile Footer/Header Logos */}
      {lp.configuracion_logos.logo_izquierdo.mobile?.visible && (
        <div
          className="md:hidden absolute z-50"
          style={{
            top: lp.configuracion_logos.logo_izquierdo.mobile.margen_superior,
            left: lp.configuracion_logos.logo_izquierdo.mobile.margen_izquierdo,
            bottom: lp.configuracion_logos.logo_izquierdo.mobile.margen_inferior,
            right: lp.configuracion_logos.logo_izquierdo.mobile.margen_derecho,
          }}
        >
          <div style={{ position: "relative", width: getSize(lp.configuracion_logos.logo_izquierdo.mobile.width, 60), height: getSize(lp.configuracion_logos.logo_izquierdo.mobile.height, 30) }}>
            <img
              src={
                lp.configuracion_logos.logo_izquierdo.light_mode.sourceType === "base64"
                  ? lp.configuracion_logos.logo_izquierdo.light_mode.base64 || lp.configuracion_logos.logo_izquierdo.light_mode.image
                  : lp.configuracion_logos.logo_izquierdo.light_mode.image
              }
              alt="Logo"
              className="object-contain dark:hidden w-full h-full"
            />
            <img
              src={
                lp.configuracion_logos.logo_izquierdo.dark_mode.sourceType === "base64"
                  ? lp.configuracion_logos.logo_izquierdo.dark_mode.base64 || lp.configuracion_logos.logo_izquierdo.dark_mode.image
                  : lp.configuracion_logos.logo_izquierdo.dark_mode.image || lp.configuracion_logos.logo_izquierdo.light_mode.image
              }
              alt="Logo Dark"
              className="object-contain hidden dark:block w-full h-full"
            />
          </div>
        </div>
      )}

      {lp.configuracion_logos.logo_derecho.mobile?.visible && (
        <div
          className="md:hidden absolute z-50"
          style={{
            top: lp.configuracion_logos.logo_derecho.mobile.margen_superior,
            left: lp.configuracion_logos.logo_derecho.mobile.margen_izquierdo,
            bottom: lp.configuracion_logos.logo_derecho.mobile.margen_inferior ?? 20,
            right: lp.configuracion_logos.logo_derecho.mobile.margen_derecho ?? 20,
          }}
        >
          <div style={{ position: "relative", width: getSize(lp.configuracion_logos.logo_derecho.mobile.width, 80), height: getSize(lp.configuracion_logos.logo_derecho.mobile.height, 30) }}>
            <img
              src={
                lp.configuracion_logos.logo_derecho.light_mode.sourceType === "base64"
                  ? lp.configuracion_logos.logo_derecho.light_mode.base64 || lp.configuracion_logos.logo_derecho.light_mode.image
                  : lp.configuracion_logos.logo_derecho.light_mode.image
              }
              alt="Logo"
              className="object-contain dark:hidden w-full h-full"
            />
            <img
              src={
                lp.configuracion_logos.logo_derecho.dark_mode.sourceType === "base64"
                  ? lp.configuracion_logos.logo_derecho.dark_mode.base64 || lp.configuracion_logos.logo_derecho.dark_mode.image
                  : lp.configuracion_logos.logo_derecho.dark_mode.image || lp.configuracion_logos.logo_derecho.light_mode.image
              }
              alt="Logo Dark"
              className="object-contain hidden dark:block w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
