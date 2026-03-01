"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BodegaBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function BodegaBreadcrumb({ items }: BodegaBreadcrumbProps) {
  // Fix duplication: filter out the root "Bodega" if any view statically passes it
  const filteredItems = items.filter((item) => item.label.toLowerCase() !== "bodega");

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/bodega" className="inline-flex items-center gap-1 hover:text-foreground">
        <Home className="h-4 w-4" />
        <span>Bodega</span>
      </Link>
      {filteredItems.map((item, index) => (
        <div key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
