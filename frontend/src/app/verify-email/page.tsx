// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { FormError, FormSuccess } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, getErrorMessage } from "@/lib/api";

function VerifyEmail() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">(token ? "loading" : "idle");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  // Tokens are single-use: guard against React strict mode running the effect twice.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    authApi
      .verifyEmail(token)
      .then(() => setState("ok"))
      .catch((err) => {
        setError(getErrorMessage(err, "Verification failed."));
        setState("error");
      });
  }, [token]);

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setNotice((await authApi.resendVerification(email)).message);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <AuthCard title={state === "ok" ? "Email verified" : "Verify your email"} description="HDOS Rwanda account activation">
      {state === "loading" && <p role="status" className="text-sm">Verifying…</p>}
      {state === "ok" && (
        <>
          <FormSuccess message="Your email is verified. You can now sign in." />
          <Button asChild className="w-full"><Link href="/login">Go to sign in</Link></Button>
        </>
      )}
      {state === "idle" && <p className="text-sm">Open the verification link we emailed you to activate your account.</p>}
      {(state === "error" || state === "idle") && (
        <form onSubmit={resend} className="space-y-3">
          <FormError message={error} />
          <FormSuccess message={notice} />
          <div className="space-y-2">
            <Label htmlFor="email">Need a new link? Enter your email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={!email}>Resend verification email</Button>
        </form>
      )}
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
