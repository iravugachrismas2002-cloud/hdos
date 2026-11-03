// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  label: string;
  className?: string;
  barClassName?: string;
}

export function Progress({ value, label, className, barClassName }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
    >
      <div className={cn("h-full rounded-full bg-primary transition-all", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}
