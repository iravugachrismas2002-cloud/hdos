// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ActivityTab } from "@/components/venture/ActivityTab";
import { AssessTab } from "@/components/venture/AssessTab";
import { BusinessModelTab } from "@/components/venture/BusinessModelTab";
import { DiscoverTab } from "@/components/venture/DiscoverTab";
import { FinancialTab } from "@/components/venture/FinancialTab";
import { FundingTab } from "@/components/venture/FundingTab";
import { GrowthTab } from "@/components/venture/GrowthTab";
import { OverviewTab } from "@/components/venture/OverviewTab";
import { ProductTab } from "@/components/venture/ProductTab";
import { TeamTab } from "@/components/venture/TeamTab";
import { ValidateTab } from "@/components/venture/ValidateTab";
import { VentureHeader } from "@/components/venture/VentureHeader";
import { VentureProvider } from "@/components/venture/access";
import { ventureKey } from "@/components/venture/hooks";
import { ErrorState, ListSkeleton } from "@/components/States";
import { ventureApi } from "@/lib/api";
import type { VentureDetail, VentureSection } from "@/lib/venture-types";
import { useAppearance } from "@/contexts/AppearanceContext";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview", sections: ["overview"] },
  { id: "discover", label: "Discover", sections: ["discovery"] },
  { id: "validate", label: "Validate", sections: ["validation"] },
  { id: "assess", label: "Assess", sections: ["assessment"] },
  { id: "product", label: "Product Studio", sections: ["product"] },
  { id: "business", label: "Business model", sections: ["business-model"] },
  { id: "financial", label: "Financial", sections: ["financial"] },
  { id: "funding", label: "Funding", sections: ["funding"] },
  { id: "team", label: "Team & documents", sections: ["team", "documents"] },
  { id: "growth", label: "Growth", sections: ["growth"] },
  { id: "activity", label: "Activity", sections: ["activity"] },
] as const satisfies readonly { id: string; label: string; sections: readonly VentureSection[] }[];
type TabId = (typeof TABS)[number]["id"];

/** Mirrors the API rule for advisors: overview always, `team` and `activity` never, everything else only if shared. */
const advisorCanRead = (section: VentureSection, shared: readonly VentureSection[]) =>
  section === "overview" || (section !== "team" && section !== "activity" && shared.includes(section));

const visibleTabs = (detail: VentureDetail) =>
  detail.myRole === "ADVISOR" ? TABS.filter((t) => t.sections.some((s) => advisorCanRead(s, detail.sharedSections))) : TABS;

export default function VentureWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useAppearance();
  const [tab, setTab] = useState<TabId>("overview");
  const detail = useQuery({ queryKey: ventureKey(id, "detail"), queryFn: () => ventureApi.get(id) });

  if (detail.isLoading) return <ListSkeleton rows={3} />;
  if (detail.isError || !detail.data) {
    return (
      <div className="space-y-3">
        <Link href="/venture-builder" className="text-sm text-primary hover:underline">← All ventures</Link>
        <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
      </div>
    );
  }
  const data = detail.data;
  const tabs = visibleTabs(data);
  const active = tabs.some((x) => x.id === tab) ? tab : tabs[0].id;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = tabs[(keys[e.key] + tabs.length) % tabs.length];
    setTab(next.id);
    document.getElementById(`vtab-${next.id}`)?.focus();
  };

  return (
    <VentureProvider project={data}>
      <div className="space-y-6">
        <VentureHeader detail={data} />

        <div role="tablist" aria-label={t("Venture sections")} className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
          {tabs.map((x, i) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              id={`vtab-${x.id}`}
              aria-selected={active === x.id}
              aria-controls={`vpanel-${x.id}`}
              tabIndex={active === x.id ? 0 : -1}
              onClick={() => setTab(x.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active === x.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {x.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`vpanel-${active}`} aria-labelledby={`vtab-${active}`} tabIndex={0} className="space-y-6 focus-visible:outline-none">
          {active === "overview" && <OverviewTab detail={data} onOpenTab={(next) => { const found = tabs.find((x) => x.id === next); if (found) setTab(found.id); }} />}
          {active === "discover" && <DiscoverTab />}
          {active === "validate" && <ValidateTab />}
          {active === "assess" && <AssessTab />}
          {active === "product" && <ProductTab />}
          {active === "business" && <BusinessModelTab />}
          {active === "financial" && <FinancialTab />}
          {active === "funding" && <FundingTab />}
          {active === "team" && <TeamTab />}
          {active === "growth" && <GrowthTab />}
          {active === "activity" && <ActivityTab />}
        </div>
      </div>
    </VentureProvider>
  );
}
