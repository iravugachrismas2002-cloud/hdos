// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { PasswordInput } from "@/components/PasswordInput";
import { FormError } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, getErrorMessage } from "@/lib/api";
import { ROLE_LABELS, SELF_ROLES } from "@/lib/format";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "A lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "A number", test: (p: string) => /[0-9]/.test(p) },
];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [role, setRole] = useState<Role>("STUDENT");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ requiresVerification: boolean } | null>(null);

  const passwordOk = RULES.every((r) => r.test(form.password));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await authApi.register({ ...form, name: form.name || undefined, role });
      setDone({ requiresVerification: res.requiresVerification });
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthCard title="Check your email" description="One more step">
        <p className="text-sm">
          {done.requiresVerification
            ? `We sent a verification link to ${form.email}. Open it to activate your account, then sign in.`
            : "Your account is ready. You can sign in now (email verification is optional in this environment)."}
        </p>
        <Button asChild className="w-full"><Link href="/login">Go to sign in</Link></Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      description="Build a development pathway grounded in Rwanda's public data"
      footer={<p>Already registered? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link></p>}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error} />
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" autoComplete="new-password" required aria-describedby="pw-rules" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <ul id="pw-rules" className="grid grid-cols-2 gap-x-2 text-xs">
            {RULES.map((r) => (
              <li key={r.label} className={cn(r.test(form.password) ? "text-green-700" : "text-muted-foreground")}>
                {r.test(form.password) ? "✓" : "○"} {r.label}
              </li>
            ))}
          </ul>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">I am a</legend>
          <div className="grid grid-cols-2 gap-2">
            {SELF_ROLES.map((r) => (
              <label
                key={r}
                className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm", role === r && "border-primary bg-primary/5")}
              >
                <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" className="w-full" disabled={busy || !passwordOk || !form.email}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
