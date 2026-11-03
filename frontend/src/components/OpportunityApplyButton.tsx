"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { applicationsApi, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { Opportunity } from "@/lib/types";

interface OpportunityApplyButtonProps {
  opportunity: Opportunity;
}

const inferSuggestions = (opportunity: Opportunity) => {
  const text = `${opportunity.title} ${opportunity.description ?? ""} ${opportunity.eligibility ?? ""}`.toLowerCase();
  const suggestions = new Set<string>();
  if (/\b(job|employment|career|intern|work)\b/.test(text)) suggestions.add("CV or résumé");
  if (/\b(scholar|study|university|school|student|academic|fellowship)\b/.test(text)) suggestions.add("Academic transcript");
  if (/\b(diploma|degree|qualification|education)\b/.test(text)) suggestions.add("Diploma or certificate");
  if (/\b(identity|national|passport|identification)\b/.test(text)) suggestions.add("Identity document");
  return [...suggestions];
};

export function OpportunityApplyButton({ opportunity }: OpportunityApplyButtonProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const suggestions = inferSuggestions(opportunity);

  const prepareApplication = async () => {
    setBusy(true);
    setMessage(null);
    setMissing([]);
    try {
      const application = await applicationsApi.create(opportunity.id);
      const result = await applicationsApi.aiPrepare(application.id);
      setMissing(result.missing);
      setMessage(
        result.missing.length > 0
          ? "Add the missing documents before submitting through the official provider."
          : "Your AI application package is ready for review."
      );
    } catch (error) {
      setMessage(getErrorMessage(error, "The AI application package could not be prepared."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" size="sm" onClick={() => setConfirming(true)} disabled={busy}>
        {busy ? <Loader2 className="mr-2 animate-spin" size={14} /> : <Sparkles className="mr-2" size={14} />}
        Apply with HDOS AI
      </Button>
      {message && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-950" role="status">
          <p>{message}</p>
          {missing.length > 0 && (
            <>
              <p className="mt-1 font-semibold">Required documents:</p>
              <ul className="list-disc pl-4">
                {missing.map((document) => <li key={document}>{document}</li>)}
              </ul>
              <Link className="mt-1 inline-block font-semibold underline" href="/applications">
                Add documents in the application portal
              </Link>
            </>
          )}
          {confirming && !message && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="font-semibold">Documents to prepare</p>
              {opportunity.documentRequirements.length > 0 ? (
                <ul className="mt-1 list-disc pl-4">
                  {opportunity.documentRequirements.map((requirement) => (
                    <li key={requirement.key}>{requirement.description}{requirement.mandatory ? " (required)" : " (recommended)"}</li>
                  ))}
                </ul>
              ) : suggestions.length > 0 ? (
                <>
                  <p className="mt-1">AI suggestions based on this announcement (confirm them against the official page):</p>
                  <ul className="mt-1 list-disc pl-4">{suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul>
                </>
              ) : <p className="mt-1">The announcement does not identify documents. Check the official page before applying.</p>}
              <Button className="mt-2" size="sm" onClick={() => { setConfirming(false); void prepareApplication(); }}>Confirm and prepare</Button>
            </div>
          )}
          {missing.length === 0 && (
            <Link className="mt-1 inline-block font-semibold underline" href="/applications">
              Review application
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
