"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import {
  ChartColumn,
  LayoutDashboard,
  Link2,
  LogOut,
  NotebookText,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/stats", label: "Stats", icon: ChartColumn },
  { href: "/todo", label: "Todo", icon: NotebookText },
  { href: "/notes", label: "Notes", icon: NotebookText },
  { href: "/links", label: "Links", icon: Link2 },
];

type AppSidebarProps = {
  className?: string;
  onNavigate?: () => void;
  onClose?: () => void;
};

export default function AppSidebar({ className, onNavigate, onClose }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2 px-2">
        <h2 className="text-lg font-semibold">Coredesk</h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>
      <nav className="space-y-1 text-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "app-sidebar-link",
                isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4">
        <SignOutButton>
          <button className="app-sidebar-cta">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}
