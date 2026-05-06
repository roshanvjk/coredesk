"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "./app-sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar =
    pathname === "/" || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  if (hideSidebar) {
    return <main className="min-h-dvh">{children}</main>;
  }

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden">
      <AppSidebar />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
