// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAppearance } from "@/contexts/AppearanceContext";

export function ApiStartupNotice() {
  const [visible, setVisible] = useState(false);
  const { t } = useAppearance();

  useEffect(() => {
    const update = (event: Event) => setVisible((event as CustomEvent<boolean>).detail);
    window.addEventListener("hdos:api-starting", update);
    return () => window.removeEventListener("hdos:api-starting", update);
  }, []);

  if (!visible) return null;

  return (
    <div role="status" aria-live="polite" className="fixed inset-x-4 top-4 z-[100] mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-blue-200 bg-card p-4 text-card-foreground shadow-xl">
      <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
      <div>
        <p className="font-semibold">{t("HDOS is starting…")}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("Please wait a few moments. The first request can take up to a minute on the free plan.")}</p>
      </div>
    </div>
  );
}
