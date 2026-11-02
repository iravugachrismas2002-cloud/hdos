// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppearance } from "@/contexts/AppearanceContext";
import type { Language, ThemePreference } from "@/contexts/AppearanceContext";
import { DeleteAccount } from "@/components/DeleteAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Prefs = { largeText: boolean; reduceMotion: boolean; reminders: boolean };
const DEFAULT: Prefs = { largeText: false, reduceMotion: false, reminders: true };

export default function SettingsPage() {
  const { user } = useAuth();
  const { language, theme, setLanguage, setTheme, t } = useAppearance();
  const [prefs, setPrefs] = useState(DEFAULT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hdos-ui-preferences");
      if (raw) setPrefs({ ...DEFAULT, ...JSON.parse(raw) });
    } catch { /* retain accessible defaults */ }
  }, []);

  const save = (next: Prefs) => {
    setPrefs(next);
    try {
      const stored = JSON.parse(localStorage.getItem("hdos-ui-preferences") ?? "{}");
      localStorage.setItem("hdos-ui-preferences", JSON.stringify({ ...stored, ...next }));
    } catch { /* preferences remain usable for this session */ }
    document.documentElement.classList.toggle("large-text", next.largeText);
    document.documentElement.classList.toggle("reduce-motion", next.reduceMotion);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return <div className="mx-auto max-w-3xl space-y-7">
    <header><p className="text-xs font-bold tracking-wider text-blue-700">{t("PREFERENCES & SECURITY")}</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{t("Settings")}</h1><p className="mt-2 text-sm text-slate-600">{t("Make HDOS work better for you. Your preferences stay in this browser.")}</p></header>
    <Card className="rounded-2xl border-slate-200 shadow-sm"><CardHeader><CardTitle>{t("Account")}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-500">{t("Name")}</span><span className="font-medium">{user?.name || "Not set"}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">{t("Email")}</span><span className="font-medium">{user?.email}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">{t("Account type")}</span><span className="font-medium">{user?.role.replaceAll("_", " ")}</span></div></CardContent></Card>
    <Card className="rounded-2xl border-slate-200 shadow-sm"><CardHeader><CardTitle>{t("Language & accessibility")}</CardTitle></CardHeader><CardContent className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="settings-language">{t("Interface language")}</Label><Select id="settings-language" value={language} onChange={(e) => setLanguage(e.target.value as Language)}><option value="en">English</option><option value="rw">Kinyarwanda</option><option value="fr">Français</option></Select></div>
        <div className="space-y-2"><Label htmlFor="settings-theme">{t("Theme")}</Label><Select id="settings-theme" value={theme} onChange={(e) => setTheme(e.target.value as ThemePreference)}><option value="system">{t("System")}</option><option value="light">{t("Light")}</option><option value="dark">{t("Dark")}</option></Select></div>
      </div>
      <label className="flex cursor-pointer items-center justify-between gap-4"><span><b className="block text-sm">{t("Larger text")}</b><span className="text-xs text-slate-500">{t("Increase text size across the app")}</span></span><input type="checkbox" checked={prefs.largeText} onChange={(e) => save({ ...prefs, largeText: e.target.checked })} className="h-5 w-5 accent-blue-700" /></label>
      <label className="flex cursor-pointer items-center justify-between gap-4"><span><b className="block text-sm">{t("Reduce motion")}</b><span className="text-xs text-slate-500">{t("Minimize interface animations")}</span></span><input type="checkbox" checked={prefs.reduceMotion} onChange={(e) => save({ ...prefs, reduceMotion: e.target.checked })} className="h-5 w-5 accent-blue-700" /></label>
      <label className="flex cursor-pointer items-center justify-between gap-4"><span><b className="block text-sm">{t("Deadline reminders")}</b><span className="text-xs text-slate-500">{t("Show reminders in your application centre")}</span></span><input type="checkbox" checked={prefs.reminders} onChange={(e) => save({ ...prefs, reminders: e.target.checked })} className="h-5 w-5 accent-blue-700" /></label>
      <p role="status" aria-live="polite" className="min-h-5 text-xs text-emerald-700">{saved ? t("Preferences saved on this device.") : ""}</p>
    </CardContent></Card>
    <Card className="rounded-2xl border-slate-200 shadow-sm"><CardHeader><CardTitle>{t("Privacy & data")}</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-slate-600">{t("Review your profile details or request account deletion and associated data removal.")}</p><DeleteAccount /></CardContent></Card>
  </div>;
}
