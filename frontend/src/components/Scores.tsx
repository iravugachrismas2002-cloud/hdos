// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { FitComponents, OccupationMatch } from "@/lib/types";

export function FitRing({ score }: { score: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const color = score >= 70 ? "stroke-green-600" : score >= 50 ? "stroke-amber-500" : "stroke-slate-400";
  return (
    <div className="relative h-16 w-16 shrink-0" role="img" aria-label={`Pathway fit ${score} out of 100`}>
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-secondary" />
        <circle
          cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          className={color} strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{score}</span>
    </div>
  );
}

const BAND: Record<OccupationMatch["band"], { label: string; variant: "success" | "warning" | "secondary" }> = {
  STRONG: { label: "Strong fit", variant: "success" },
  PROMISING: { label: "Promising", variant: "warning" },
  STRETCH: { label: "Stretch goal", variant: "secondary" },
};

const CONFIDENCE_HELP = {
  LOW: "Low confidence: your profile is incomplete or the occupation data is thin. Treat this score as a rough guide.",
  MEDIUM: "Medium confidence: based on a reasonably complete profile, but the occupation data is illustrative.",
  HIGH: "High confidence: complete profile and verified occupation data.",
} as const;

export function BandBadge({ band }: { band: OccupationMatch["band"] }) {
  return <Badge variant={BAND[band].variant}>{BAND[band].label}</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence: OccupationMatch["confidence"] }) {
  return (
    <Badge variant="outline" title={CONFIDENCE_HELP[confidence]}>
      {confidence.charAt(0) + confidence.slice(1).toLowerCase()} confidence
    </Badge>
  );
}

// Weights mirror backend/src/engine/pathwayFit.ts (WEIGHTS).
const COMPONENTS: { key: keyof FitComponents; label: string; weight: number }[] = [
  { key: "skillCoverage", label: "Skills you already have", weight: 40 },
  { key: "educationReadiness", label: "Education readiness", weight: 20 },
  { key: "marketDemand", label: "Labour-market demand", weight: 20 },
  { key: "interest", label: "Matches your interests", weight: 12 },
  { key: "nationalPriority", label: "National priority sector", weight: 8 },
];

export function ComponentBars({ components }: { components: FitComponents }) {
  return (
    <ul className="space-y-2">
      {COMPONENTS.map((c) => {
        const pct = Math.round(components[c.key] * 100);
        return (
          <li key={c.key} className="text-xs">
            <div className="mb-1 flex justify-between">
              <span>
                {c.label} <span className="text-muted-foreground">(weight {c.weight}%)</span>
              </span>
              <span className="font-medium">{pct}%</span>
            </div>
            <Progress value={pct} label={c.label} />
          </li>
        );
      })}
    </ul>
  );
}
