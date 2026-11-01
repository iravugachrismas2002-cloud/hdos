// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, MessageSquare, X, type LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const links: { href: string; label: string; icon?: LucideIcon }[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/goals", label: "Goals" },
    { href: "/assistant", label: "Ask HDOS AI", icon: MessageSquare },
    { href: "/explore", label: "Explore" },
    { href: "/insights", label: "Insights" },
    { href: "/profile", label: "My profile" },
    ...(user && (user.role === "ADMINISTRATOR" || user.role === "GOVERNMENT_ANALYST") ? [{ href: "/admin", label: "Analytics" }] : []),
  ];

  const signOut = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:p-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <BrandLogo href="/dashboard" className="w-28" />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname.startsWith(l.href) ? "page" : undefined}
                className={cn("flex items-center gap-1.5 rounded-md px-3 py-2 text-sm hover:bg-accent", pathname.startsWith(l.href) && "bg-accent font-medium")}
              >
                {l.icon && <l.icon className="h-4 w-4" aria-hidden="true" />}
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-xs text-muted-foreground">{user ? `${ROLE_LABELS[user.role]} · ${user.email}` : ""}</span>
            <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        {open && (
          <nav aria-label="Mobile" className="border-t px-4 py-2 md:hidden">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm hover:bg-accent">
                {l.icon && <l.icon className="h-4 w-4" aria-hidden="true" />}
                {l.label}
              </Link>
            ))}
            <button type="button" onClick={signOut} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent">
              Sign out
            </button>
          </nav>
        )}
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        HDOS Rwanda™ is an independent project and is not endorsed by the Government of Rwanda. © 2026 HDOS Rwanda. All rights reserved.
      </footer>
    </div>
  );
}
