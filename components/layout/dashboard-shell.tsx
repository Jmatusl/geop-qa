"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SidebarProvider, UIConfig } from "@/components/layout/sidebar-provider";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

import { useAuth } from "@/contexts/auth-context";

interface DashboardShellProps {
  children: React.ReactNode;
  user: any;
  config: UIConfig;
}

export function DashboardShell({ children, user, config }: DashboardShellProps) {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <SidebarProvider config={config}>
      <div className="relative flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
        <AppSidebar user={user} onLogout={logout} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-y-auto lg:px-4 lg:py-6">
            <div className="w-full">
              {config.showBreadcrumb && config.container === "main" && <Breadcrumbs className="mb-6" />}
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
