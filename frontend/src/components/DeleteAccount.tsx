// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FormError } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, getErrorMessage } from "@/lib/api";

export function DeleteAccount() {
  const { clearSession } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const del = useMutation({
    mutationFn: () => authApi.deleteAccount(password),
    onSuccess: () => {
      clearSession();
      router.replace("/");
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>Delete my account</CardTitle>
        <CardDescription>This permanently removes your account, profile, goals and roadmaps. It cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!open ? (
          <Button variant="destructive" onClick={() => setOpen(true)}>Delete my account…</Button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              del.mutate();
            }}
            className="space-y-3"
          >
            <FormError message={error} />
            <Label htmlFor="del-pw">Confirm with your password</Label>
            <Input id="del-pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" disabled={!password || del.isPending}>
                {del.isPending ? "Deleting…" : "Permanently delete"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
