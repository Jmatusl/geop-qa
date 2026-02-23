import { LucideIcon } from "lucide-react";

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon;
    disabled?: boolean;
    external?: boolean;
    submenu?: NavItem[];
}

export interface NavSection {
    title: string;
    items: NavItem[];
}

export type SidebarConfig = NavSection[];
