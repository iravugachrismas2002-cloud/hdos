// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { RwandaAtAGlance } from "@/components/RwandaAtAGlance";
import { Button } from "@/components/ui/button";

const STEPS = ["Your goals", "Trusted data", "Explainable scoring", "Recommendations", "Roadmap", "Tracked progress"];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <BrandLogo className="w-40" />
        <nav aria-label="Account" className="flex gap-2">
          <Button asChild variant="ghost"><Link href="/login">Sign in</Link></Button>
          <Button asChild><Link href="/register">Get started</Link></Button>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl space-y-14 px-4 py-10">
        <section className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Human Development Intelligence Operating System</h1>
          <p className="text-lg text-muted-foreground">
            Tell us where you want to go. HDOS compares your skills and education with Rwanda&apos;s occupations,
            programmes and opportunities, and gives you a <strong>transparent, explainable</strong> pathway with a
            roadmap you can track.
          </p>
          <div className="flex gap-3">
            <Button asChild size="lg"><Link href="/register">Build my pathway</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/login">I have an account</Link></Button>
          </div>
        </section>

        <section aria-labelledby="how" className="space-y-4">
          <h2 id="how" className="text-2xl font-semibold">How it works</h2>
          <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {STEPS.map((s, i) => (
              <li key={s} className="rounded-lg border p-3 text-sm">
                <span className="mb-1 block text-xs font-semibold text-primary">Step {i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground">
            Rankings always come from a deterministic scoring model (the HDOS Pathway Fit Index) that you can inspect: AI never
            changes a score or a ranking. AI is used to explain results in plain language, to write career guidance, and to power the
            HDOS Assistant, a chat you can ask about careers, skills and study options. The assistant uses Gemini and automatically
            falls back to other AI providers, or to a built-in offline answer, if one is unavailable. Every record shows its source.
          </p>
        </section>

        <section aria-labelledby="glance" className="space-y-4">
          <h2 id="glance" className="text-2xl font-semibold">Rwanda at a glance</h2>
          <RwandaAtAGlance />
        </section>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        HDOS Rwanda™ is an independent project and is not endorsed by the Government of Rwanda. © 2026 HDOS Rwanda. All rights reserved.
      </footer>
    </div>
  );
}
