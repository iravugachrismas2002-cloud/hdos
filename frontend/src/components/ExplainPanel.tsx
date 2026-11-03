// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useMutation } from "@tanstack/react-query";
import { ProviderBadge } from "@/components/ProviderBadge";
import { FormError } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getErrorMessage, goalsApi } from "@/lib/api";

export function ExplainPanel({ goalId }: { goalId: string }) {
  const explain = useMutation({ mutationFn: () => goalsApi.explain(goalId) });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Get a short plain-language explanation of your top result. The score itself never changes: the text only explains it.
      </p>
      <Button disabled={explain.isPending} onClick={() => explain.mutate()}>
        {explain.isPending ? "Writing…" : "Explain my results"}
      </Button>
      {explain.isError && <FormError message={getErrorMessage(explain.error)} />}
      {explain.data && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={explain.data.generatedBy === "ai" ? "default" : "secondary"}>
                {explain.data.generatedBy === "ai" ? `AI-generated${explain.data.model ? ` (${explain.data.model})` : ""}` : "Template explanation"}
              </Badge>
              {explain.data.generatedBy === "ai" && <ProviderBadge provider={explain.data.provider} />}
            </div>
            <p aria-live="polite">{explain.data.text}</p>
            <p className="text-xs text-muted-foreground">{explain.data.disclaimer}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
