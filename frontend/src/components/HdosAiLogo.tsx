// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import Link from "next/link";

export function HdosAiLogo({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="HDOS AI home"
      className="group inline-flex min-w-0 items-center gap-2 rounded-lg py-1 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
    >
      <svg
        aria-hidden="true"
        className="h-8 w-8 shrink-0"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hdos-ai-mark" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0B1F3A" />
            <stop offset="1" stopColor="#0D9488" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#hdos-ai-mark)" />
        <path d="M8 8V24M8 16H15M15 8V24" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M18 8H21.5C24.8 8 27 10.4 27 16C27 21.6 24.8 24 21.5 24H18V8Z" stroke="#99F6E4" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M18 8V24" stroke="#99F6E4" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="truncate text-[15px] font-bold tracking-[-0.02em] text-[#0B1F3A] transition-colors group-hover:text-teal-700 dark:text-teal-100 dark:group-hover:text-teal-200">
        HDOS AI
      </span>
    </Link>
  );
}
