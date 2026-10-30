// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { FormError, FormSuccess } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, getErrorMessage } from "@/lib/api";

const strong = (p: string) => p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p);

function ResetPassword() {
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");
    setBusy(true);
    try {
      setMessage((await authApi.resetPassword(token, password)).message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title="Link missing" description="This reset link is incomplete">
        <Button asChild className="w-full"><Link href="/forgot-password">Request a new link</Link></Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" description="You will be signed out everywhere">
      <FormError message={error} />
      {message ? (
        <>
          <FormSuccess message={message} />
          <Button asChild className="w-full"><Link href="/login">Go to sign in</Link></Button>
        </>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" autoComplete="new-password" required aria-describedby="hint" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p id="hint" className="text-xs text-muted-foreground">At least 8 characters with uppercase, lowercase and a number.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {confirm && confirm !== password && <p role="alert" className="text-xs text-destructive">Passwords do not match.</p>}
          </div>
          <Button type="submit" className="w-full" disabled={busy || !strong(password) || password !== confirm}>
            {busy ? "Saving…" : "Update password"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPassword />
    </Suspense>
  );
}
