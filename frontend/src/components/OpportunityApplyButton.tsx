"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { applicationsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface OpportunityApplyButtonProps {
  opportunityId: string;
}

export function OpportunityApplyButton({ opportunityId }: OpportunityApplyButtonProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  const prepareApplication = async () => {
    setBusy(true);
    setMessage(null);
    setMissing([]);
    try {
      const application = await applicationsApi.create(opportunityId);
      const result = await applicationsApi.aiPrepare(application.id);
      setMissing(result.missing);
      setMessage(
        result.missing.length > 0
          ? "Add the missing documents before submitting through the official provider."
          : "Your AI application package is ready for review."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The AI application package could not be prepared.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" size="sm" onClick={prepareApplication} disabled={busy}>
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
