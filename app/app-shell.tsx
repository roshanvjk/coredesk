"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import AppSidebar from "./app-sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const hideSidebar =
    pathname === "/" || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  if (hideSidebar) {
    return <main className="min-h-dvh">{children}</main>;
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden md:flex-row">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-background px-3 py-2.5 md:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="app-btn-md-outline size-9 rounded-lg"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <span className="text-base font-semibold text-foreground">Coredesk</span>
      </header>

      <AppSidebar className="hidden w-56 md:flex" />

      {mobileNavOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          />
          <AppSidebar
            className="fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] shadow-xl md:hidden"
            onNavigate={() => setMobileNavOpen(false)}
            onClose={() => setMobileNavOpen(false)}
          />
        </>
      ) : null}

      <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
    </div>
  );
}
