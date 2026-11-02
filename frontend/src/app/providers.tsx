// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { ApiStartupNotice } from "@/components/ApiStartupNotice";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } } }),
  );
  return (
    <AppearanceProvider>
      <QueryClientProvider client={client}>
        <AuthProvider>{children}</AuthProvider>
        <ApiStartupNotice />
      </QueryClientProvider>
    </AppearanceProvider>
  );
}
