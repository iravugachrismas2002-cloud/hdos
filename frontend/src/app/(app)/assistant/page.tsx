// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { ChatWindow } from "@/components/ChatWindow";

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="relative isolate overflow-hidden rounded-3xl border border-blue-900/10 bg-gradient-to-br from-[#102b52] via-[#153b70] to-[#1769aa] p-5 text-white shadow-sm sm:p-7">
        <Image src="/hdos-rwanda-logo.png" alt="" aria-hidden="true" width={320} height={320} className="pointer-events-none absolute -right-12 -top-16 -z-10 h-56 w-56 rotate-6 rounded-full object-cover opacity-[0.12] sm:-right-6 sm:-top-12 sm:h-72 sm:w-72" />
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative shrink-0 rounded-full bg-white p-1.5 shadow-lg ring-2 ring-white/50">
            <Image src="/hdos-rwanda-logo.png" alt="HDOS Rwanda logo" width={80} height={80} priority className="h-14 w-14 rounded-full object-cover sm:h-[4.5rem] sm:w-[4.5rem]" />
            <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-[#153b70] bg-amber-300 text-[#102b52]" aria-label="AI"><Sparkles size={14} fill="currentColor" /></span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">HDOS Rwanda · AI assistant</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Ask HDOS AI</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50/90">
              Ask about careers, skills and education in Rwanda. AI guidance can help explain your options; it does not change your scores or replace official sources.
            </p>
          </div>
        </div>
      </header>
      <ChatWindow />
    </div>
  );
}
