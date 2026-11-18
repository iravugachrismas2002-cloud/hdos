// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Small building blocks shared by the Venture Builder tabs.
"use client";

import type { KeyboardEvent, ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ExternalLink as ExternalLinkIcon, Lock } from "lucide-react";
import { ErrorState, ListSkeleton } from "@/components/States";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { getErrorCode } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatCoverage, isHttpUrl } from "./format";

export function Section({ title, description, actions, children, className }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0 p-4 sm:p-5">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">{children}</CardContent>
    </Card>
  );
}

/** A labelled form control. Pass the control's id as `htmlFor`. */
export function Field({ htmlFor, label, hint, className, children }: { htmlFor: string; label: string; hint?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CheckboxField({ id, checked, onChange, disabled, children, className }: { id: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <label htmlFor={id} className="text-sm leading-snug">{children}</label>
    </div>
  );
}

export function RadioOption({ name, value, current, onChange, disabled, children }: { name: string; value: string; current: string; onChange: (value: string) => void; disabled?: boolean; children: ReactNode }) {
  const id = `${name}-${value}`;
  return (
    <div className="flex items-start gap-2">
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={current === value}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <label htmlFor={id} className="text-sm leading-snug">{children}</label>
    </div>
  );
}

export function Bullets({ items, empty, className }: { items: readonly string[] | undefined | null; empty?: string; className?: string }) {
  if (!items || items.length === 0) return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
  return (
    <ul className={cn("list-disc space-y-1 pl-5 text-sm", className)}>
      {items.map((item, i) => <li key={`${i}-${item}`} className="break-words">{item}</li>)}
    </ul>
  );
}

export function Notice({ tone = "info", children, className }: { tone?: "info" | "warning"; children: ReactNode; className?: string }) {
  return (
    <div
      role={tone === "warning" ? "alert" : "note"}
      className={cn("rounded-md border p-3 text-sm", tone === "warning" ? "border-amber-300 bg-amber-50 text-amber-950" : "border-blue-200 bg-blue-50 text-blue-950", className)}
    >
      {children}
    </div>
  );
}

/** Shown in place of write controls when the member's role cannot use them. */
export function ReadOnlyNote({ children }: { children?: ReactNode }) {
  return (
    <p className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
      <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children ?? "Your role on this venture is read-only for this action."}
    </p>
  );
}

export function NotSharedState() {
  return (
    <div role="status" className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
      <Lock className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">This section has not been shared with you</p>
      <p className="text-sm text-muted-foreground">The venture owner chooses which sections an advisor can read. Ask them if you need access.</p>
    </div>
  );
}

/** Loading / error / not-shared handling for one query; renders `children` once data has arrived. */
export function QueryView<T>({ query, rows = 2, children }: { query: UseQueryResult<T>; rows?: number; children: (data: T) => ReactNode }) {
  if (query.isLoading) return <ListSkeleton rows={rows} />;
  if (query.isError) {
    return getErrorCode(query.error) === "VENTURE_SECTION_NOT_SHARED" ? <NotSharedState /> : <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }
  if (query.data === undefined) return null;
  return <>{children(query.data)}</>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A score is never shown without the evidence coverage behind it; `null` is "Unknown", never 0. */
export function ScoreWithCoverage({ score, coverage, label }: { score: number | null; coverage: number; label: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold">
        {score === null ? <span className="text-muted-foreground">Unknown</span> : <>{score}<span className="text-xs font-normal text-muted-foreground">/100</span></>}
      </p>
      <Progress value={coverage * 100} label={`Evidence coverage for ${label}`} className="h-1.5 w-24" />
      <p className="text-xs text-muted-foreground">Evidence coverage {formatCoverage(coverage)}</p>
    </div>
  );
}

/** Opens in a new tab; only http(s) URLs are rendered as links. */
export function ExternalLink({ href, children, className }: { href: string | null | undefined; children: ReactNode; className?: string }) {
  if (!isHttpUrl(href)) return <span className={className}>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
      {children}
      <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** Secondary tab bar inside a workspace tab (arrow keys, Home and End move between tabs). Pair with `subPanelProps`. */
export function SubTabs<T extends string>({ prefix, label, tabs, value, onChange }: { prefix: string; label: string; tabs: readonly { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const targets: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in targets)) return;
    e.preventDefault();
    const next = tabs[(targets[e.key] + tabs.length) % tabs.length];
    onChange(next.id);
    document.getElementById(`${prefix}-tab-${next.id}`)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1">
      {tabs.map((t, i) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`${prefix}-tab-${t.id}`}
          aria-selected={value === t.id}
          aria-controls={`${prefix}-panel-${t.id}`}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKeyDown(e, i)}
          className={cn("shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", value === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
export const subPanelProps = (prefix: string, id: string) => ({ role: "tabpanel" as const, id: `${prefix}-panel-${id}`, "aria-labelledby": `${prefix}-tab-${id}`, className: "space-y-6" });

/** Horizontally scrollable wrapper so wide tables work on phones. */
export function TableWrap({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto rounded-md border" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
export const tableClass = "w-full min-w-[32rem] border-collapse text-left text-sm";
export const thClass = "whitespace-nowrap border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground";
export const tdClass = "border-b px-3 py-2 align-top";
