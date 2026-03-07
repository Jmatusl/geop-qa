"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, Menu as MenuIcon, Settings, LogOut, User, Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "./sidebar-provider";
import { useMenuTree, MenuItem as ApiMenuItem } from "@/lib/hooks/use-menus";
import { useTheme } from "next-themes";

interface AppSidebarProps {
  user: any;
  onLogout: () => void;
}

// Helper para iconos dinámicos (Versión Robusta)
const DynamicIcon = ({ name, className }: { name?: string; className?: string }) => {
  if (!name) return <Settings className={className} />;

  // Acceso seguro al namespace de iconos
  // @ts-ignore
  const Icon = LucideIcons[name] || LucideIcons[name.charAt(0).toUpperCase() + name.slice(1)];

  if (!Icon) return <Settings className={className} />;
  return <Icon className={className} />;
};

export function AppSidebar({ user, onLogout }: AppSidebarProps) {
  const pathname = usePathname();
  const { expanded, setExpanded, isMobile, toggle, config } = useSidebar();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [openSubmenus, setOpenSubmenus] = React.useState<Record<string, boolean>>({});

  const { data: menuItems, isLoading } = useMenuTree(true);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (menuItems) {
      const newOpenState = { ...openSubmenus };
      const findActiveParent = (items: ApiMenuItem[]) => {
        let found = false;
        for (const item of items) {
          if (item.children && item.children.length > 0) {
            const hasActiveChild = item.children.some((child) => child.path && (pathname === child.path || pathname.startsWith(child.path + "/")));
            const hasActiveGrandChild = findActiveParent(item.children);

            if (hasActiveChild || hasActiveGrandChild) {
              newOpenState[item.title] = true;
              found = true;
            }
          }
        }
        return found;
      };
      findActiveParent(menuItems);
      setOpenSubmenus(newOpenState);
    }
  }, [pathname, menuItems]);

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const closeOnMobile = () => {
    if (isMobile) {
      setExpanded(false);
    }
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const NavItemRender = ({ item, isChild = false }: { item: ApiMenuItem; isChild?: boolean }) => {
    const hasSubmenu = item.children && item.children.length > 0;

    // Si no tiene submenú Y no tiene path, no renderizar (es un padre vacío)
    if (!hasSubmenu && !item.path) return null;

    // Lógica de activo especializada para evitar duplicidad entre Resumen y Subpáginas
    const isModuleRoot = ["/bodega", "/mantencion", "/insumos", "/actividades", "/auditoria"].includes(item.path || "");
    const itemActive = hasSubmenu ? isActive(item.path) : isModuleRoot ? pathname === item.path : isActive(item.path);

    const isOpen = openSubmenus[item.title];
    const shouldShowIcon = item.showIcon !== false;

    const content = (
      <div className="flex items-center">
        {shouldShowIcon && (
          <div className={cn("flex items-center justify-center h-5 w-5", expanded || isMobile ? "mr-2" : "")}>
            <DynamicIcon name={item.icon} className="h-4 w-4" />
          </div>
        )}
        {(expanded || isMobile) && <span className="truncate">{item.title}</span>}
      </div>
    );

    if (hasSubmenu) {
      // Caso 1: Sidebar contraído y Popup habilitado -> Mostrar submenú en Dropdown
      if (!expanded && !isMobile && config.aside.show_popup) {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={cn("w-full justify-center px-2 hover:bg-slate-100 dark:hover:bg-slate-800", itemActive && "bg-slate-100 dark:bg-slate-800")}>
                <DynamicIcon name={item.icon} className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-48 ml-2">
              <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {item.children!.map((sub) => {
                const subModuleRoot = ["/bodega", "/mantencion", "/insumos", "/actividades", "/auditoria"].includes(sub.path || "");
                const subActive = subModuleRoot ? pathname === sub.path : isActive(sub.path);

                return (
                  <DropdownMenuItem key={sub.id} asChild>
                    <Link href={sub.path || "#"} className={cn("w-full cursor-pointer", subActive && "bg-slate-100 dark:bg-slate-800")} onClick={closeOnMobile}>
                      <div className="flex items-center">
                        {sub.showIcon !== false && <DynamicIcon name={sub.icon} className="h-4 w-4 mr-2" />}
                        <span>{sub.title}</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }

      // Caso 2: Sidebar expandido o móvil -> Collapsible normal
      return (
        <Collapsible open={isOpen} onOpenChange={() => toggleSubmenu(item.title)} className="w-full">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className={cn("w-full justify-between hover:bg-slate-100 dark:hover:bg-slate-800", !expanded && !isMobile && "justify-center px-2")}>
              {content}
              {(expanded || isMobile) && <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen ? "transform rotate-180" : "")} />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            {item.children!.map((subItem) => (
              <NavItemRender key={subItem.id} item={subItem} isChild />
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    const LinkElement = (
      <Link
        href={item.path || "#"}
        onClick={closeOnMobile}
        className={cn(
          "flex items-center py-2 px-3 rounded-md text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800",
          itemActive ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50" : "text-slate-600 dark:text-slate-400",
          isChild && (expanded || isMobile) && "pl-9",
          !expanded && !isMobile && "justify-center px-2",
        )}
      >
        {content}
        {!expanded && !isMobile && <span className="sr-only">{item.title}</span>}
      </Link>
    );

    // Si está colapsado, envolver en Tooltip
    if (!expanded && !isMobile && config.aside.show_tooltip) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{LinkElement}</TooltipTrigger>
            <TooltipContent side="right">{item.title}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return LinkElement;
  };

  const SidebarContent = () => {
    const logoCfg = mounted && isDark ? config.logo.dark_mode : config.logo.light_mode;
    const logo = logoCfg.sourceType === "base64" ? logoCfg.base64 || logoCfg.image : logoCfg.image;

    const isoCfg = mounted && isDark ? config.isotipo.dark_mode : config.isotipo.light_mode;
    const isotype = isoCfg.sourceType === "base64" ? isoCfg.base64 || isoCfg.image : isoCfg.image;

    return (
      <div className="flex bg-white dark:bg-slate-950 flex-col h-full border-r dark:border-slate-800">
        <div
          className={cn(
            "flex flex-col items-center border-b dark:border-slate-800 transition-all duration-300 relative overflow-hidden",
            expanded || isMobile ? config.logo.height_container : config.isotipo.show ? config.isotipo.height_container : "h-12 border-b-0",
          )}
        >
          {expanded || isMobile ? (
            <div className={cn("flex flex-col items-center w-full px-2", config.logo.margin_top_class)}>
              <img src={logo} alt={config.title} className={cn("object-contain transition-all", config.logo.width_class, config.logo.height_class)} />
            </div>
          ) : (
            <div className={cn("flex flex-col items-center w-full", config.isotipo.margin_top_class)}>
              {config.isotipo.show && <img src={isotype} alt="Isotipo" className={cn("object-contain transition-all", config.isotipo.width_class, config.isotipo.height_class)} />}
            </div>
          )}
          {/* Botón de toggle siempre visible si no es móvil */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className={cn("absolute top-2 right-2 hidden lg:flex h-8 w-8 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800", !expanded && "right-auto")}
            >
              <MenuIcon className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {!mounted ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              menuItems?.map((item) => <NavItemRender key={item.id} item={item} />)
            )}
            {mounted && !isLoading && (!menuItems || menuItems.length === 0) && <div className="text-center p-4 text-sm text-muted-foreground">No hay menús configurados</div>}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t dark:border-slate-800 mt-auto min-h-[73px]">
          {mounted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start px-0 hover:bg-transparent">
                  <div className="flex items-center gap-3 w-full">
                    <Avatar>
                      <AvatarImage src={user?.avatarUrl || user?.person?.imagePath} />
                      <AvatarFallback>
                        {user?.firstName?.[0]}
                        {user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    {(expanded || isMobile) && (
                      <div className="flex flex-col items-start overflow-hidden">
                        <span className="text-sm font-medium truncate w-full text-left">
                          {user?.firstName} {user?.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground truncate w-full text-left">{user?.email}</span>
                      </div>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/perfil" className="cursor-pointer" onClick={closeOnMobile}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-500 hover:text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <Sheet open={expanded} onOpenChange={setExpanded}>
        <SheetContent side="left" className="p-0 w-80">
          <SheetHeader className="sr-only">
            <SheetTitle>Menú de Navegación</SheetTitle>
            <SheetDescription>Acceso a las secciones del sistema</SheetDescription>
          </SheetHeader>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className={cn("hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-300", expanded ? config.aside.max_width_class : config.aside.min_width_class)}>
      <SidebarContent />
    </aside>
  );
}
