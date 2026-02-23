import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import QueryProvider from "@/components/providers/query-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { prisma } from "@/lib/prisma";
import uiConfigFallback from "@/lib/config/ui-config-fallback.json";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

export function generateViewport(): Viewport {
  return {
    themeColor: "#192a7b",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const configSetting = await prisma.appSetting.findUnique({
      where: { key: "UI_CONFIG" },
    });

    const config = configSetting?.isActive && configSetting.value ? { ...uiConfigFallback, ...(configSetting.value as any) } : uiConfigFallback;

    return {
      title: config.title || "GEOP - Sotex",
      description: config.description || "Sistema de Gestión Operativa - Sotex",
      manifest: "/manifest.json",
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: config.title || "GEOP",
      },
      formatDetection: {
        telephone: false,
      },
      icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
        apple: "/apple-icon.png",
      },
    };
  } catch {
    return {
      title: uiConfigFallback.title,
      description: uiConfigFallback.description,
      manifest: "/manifest.json",
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "GEOP",
      },
      icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
        apple: "/apple-icon.png",
      },
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geist.variable} antialiased`}>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={true} disableTransitionOnChange={false}>
            <AuthProvider>{children}</AuthProvider>
            <Toaster position="top-right" richColors />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
