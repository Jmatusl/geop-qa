"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, Settings, Warehouse, Package, Tag, Ruler, SlidersHorizontal, Wrench, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Mapa de iconos para evitar pasar componentes de servidor a cliente
const ICON_MAP: Record<string, any> = {
  Warehouse,
  Package,
  Tag,
  Ruler,
  SlidersHorizontal,
  Wrench,
  FileSpreadsheet,
  Settings,
};

interface ConfigItem {
  title: string;
  description: string;
  href: string;
  iconName: string;
  color: string;
  bg: string;
  border: string;
}

interface Category {
  title: string;
  description: string;
  items: ConfigItem[];
}

interface BodegaConfigDashboardProps {
  categories: Category[];
}

export function BodegaConfigDashboard({ categories }: BodegaConfigDashboardProps) {
  const [search, setSearch] = useState("");

  const allItems = useMemo(() => categories.flatMap((c) => c.items), [categories]);

  const filteredCategories = useMemo(() => {
    if (!search) return categories;

    const lowerSearch = search.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => item.title.toLowerCase().includes(lowerSearch) || item.description.toLowerCase().includes(lowerSearch)),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, search]);

  const filteredAllItems = useMemo(() => {
    if (!search) return allItems;
    const lowerSearch = search.toLowerCase();
    return allItems.filter((item) => item.title.toLowerCase().includes(lowerSearch) || item.description.toLowerCase().includes(lowerSearch));
  }, [allItems, search]);

  const renderIcon = (iconName: string, className: string) => {
    const Icon = ICON_MAP[iconName] || Settings;
    return <Icon className={className} />;
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* ══ HEADER & SEARCH ══ */}
      <div className="bg-white dark:bg-slate-900 border-b border-border sticky top-0 z-20 pb-4 px-0 lg:px-0 lg:bg-transparent lg:dark:bg-transparent lg:border-none lg:static">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-5 pb-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <Warehouse className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                Configuración <span className="hidden lg:inline">de Bodega</span>
              </h1>
              <p className="text-sm lg:text-lg text-muted-foreground uppercase lg:normal-case font-bold lg:font-normal tracking-wider lg:tracking-normal">Mantenedores y parámetros del módulo</p>
            </div>
          </div>

          <div className="relative w-full lg:max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" />
            <Input
              placeholder="Buscar mantenedor..."
              className="pl-10 pr-10 h-11 lg:h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 rounded-xl focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-500 shadow-sm transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
            {search && (
              <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent" onClick={() => setSearch("")}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ══ VISTA MÓVIL (Lista filtrada) ══ */}
      <div className="lg:hidden px-0 pb-8">
        {filteredAllItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredAllItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-3 rounded-xl border ${item.border} bg-white dark:bg-slate-900 p-4 shadow-sm active:scale-95 transition-transform`}
              >
                <div className={`w-14 h-14 rounded-xl ${item.bg} flex items-center justify-center`}>{renderIcon(item.iconName, `w-7 h-7 ${item.color}`)}</div>
                <div className="text-center">
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-tight">{item.title}</p>
                  <p className={`text-[10px] mt-1 uppercase font-bold tracking-tighter ${item.color}`}>{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">No se encontraron resultados</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">Prueba con otros términos</p>
            </div>
          </div>
        )}
      </div>

      {/* ══ VISTA DESKTOP (Categorizada) ══ */}
      <div className="hidden lg:block space-y-10 pb-12">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <section key={category.title} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <div className="shrink-0">
                  <h2 className="text-lg font-bold tracking-tight uppercase text-slate-400 dark:text-slate-500">{category.title}</h2>
                </div>
                <div className="h-px flex-1 bg-border opacity-30" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {category.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex flex-col justify-between rounded-xl border bg-white dark:bg-slate-900/50 p-5 shadow-sm transition-all hover:shadow-lg hover:border-emerald-600/50 dark:hover:border-emerald-500/50 hover:-translate-y-1 overflow-hidden relative border-slate-200 dark:border-slate-800"
                  >
                    <div className="space-y-4 relative z-10">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.bg}`}>{renderIcon(item.iconName, `w-6 h-6 ${item.color}`)}</div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{item.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{item.description}</p>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-linear-to-br from-transparent to-transparent group-hover:from-emerald-600/5 dark:group-hover:from-emerald-500/5 transition-all duration-500 z-0" />
                  </Link>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Search className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xl font-medium">No se encontraron mantenedores</p>
              <p className="text-slate-400 dark:text-slate-500">Lamentamos no haber encontrado lo que buscas para &quot;{search}&quot;</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
