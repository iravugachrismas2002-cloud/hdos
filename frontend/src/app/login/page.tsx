// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { FormError, FormSuccess } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, getErrorCode, getErrorMessage } from "@/lib/api";

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [isLoading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setNeedsVerification(false);
    setBusy(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setNeedsVerification(getErrorCode(err) === "EMAIL_NOT_VERIFIED");
      setError(getErrorMessage(err, "Sign-in failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      const res = await authApi.resendVerification(email);
      setNotice(res.message);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your HDOS Rwanda account"
      footer={
        <>
          <p>
            New here? <Link href="/register" className="font-medium text-primary hover:underline">Create an account</Link>
          </p>
          <Link href="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error} />
        <FormSuccess message={notice} />
        {needsVerification && (
          <Button type="button" variant="outline" size="sm" onClick={resend} disabled={!email}>
            Resend verification email
          </Button>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy || !email || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
