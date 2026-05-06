"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { ChartColumn, LayoutDashboard, Link2, LogOut, NotebookText, Wallet } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/stats", label: "Stats", icon: ChartColumn },
  { href: "/todo", label: "Todo", icon: NotebookText },
  { href: "/notes", label: "Notes", icon: NotebookText },
  { href: "/links", label: "Links", icon: Link2 },
];

export default function AppSidebar() {
  return (
    <aside className="flex h-full min-h-0 w-56 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground">
      <h2 className="mb-4 px-2 text-lg font-semibold">Coredesk</h2>
      <nav className="space-y-1 text-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="app-sidebar-link">
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
