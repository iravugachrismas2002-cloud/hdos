// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { Badge } from "@/components/ui/badge";
import { providerLabel } from "@/lib/format";

/** Shows which AI provider answered; the built-in fallback is labelled as an offline answer. */
export function ProviderBadge({ provider, model }: { provider: string | null | undefined; model?: string | null }) {
  const isFallback = !provider || provider === "fallback";
  return (
    <Badge variant={isFallback ? "secondary" : "default"} title={model ? `Model: ${model}` : undefined}>
      {providerLabel(provider)}
    </Badge>
  );
}
