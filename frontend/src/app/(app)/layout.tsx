// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";

/** Every page in this group requires a signed-in user. */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <p className="text-muted-foreground">Loading your session…</p>
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
}
