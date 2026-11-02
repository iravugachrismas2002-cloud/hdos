// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Trash2 } from "lucide-react";
import { ProviderBadge } from "@/components/ProviderBadge";
import { ErrorState, FormError, ListSkeleton } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { chatApi, getErrorCode, getErrorMessage, goalsApi } from "@/lib/api";
import type { ChatMsg } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 1000;
const DEFAULT_DISCLAIMER =
  "HDOS Assistant gives general guidance and can make mistakes. Scores and rankings always come from the deterministic HDOS model, not from the assistant. Check important details with official sources.";
const STARTERS = [
  "What skills are most in demand in Rwanda?",
  "How can I move from TVET to a university degree?",
  "What should I do first to reach my goal?",
  "How do I find scholarships or internships?",
];

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function Bubble({ role, content, provider, time }: { role: ChatMsg["role"]; content: string; provider?: string | null; time?: string }) {
  const mine = role === "user";
  return (
    <li className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] space-y-1 rounded-2xl px-4 py-2 text-sm", mine ? "bg-primary text-primary-foreground" : "border bg-card")}>
        <span className="sr-only">{mine ? "You said:" : "Assistant said:"}</span>
        <p className="whitespace-pre-wrap break-words">{content}</p>
        <div className={cn("flex items-center gap-2 text-[11px]", mine ? "justify-end text-primary-foreground/80" : "text-muted-foreground")}>
          {!mine && provider && <ProviderBadge provider={provider} />}
          {time && <span>{time}</span>}
        </div>
      </div>
    </li>
  );
}

export function ChatWindow() {
  const queryClient = useQueryClient();
  const history = useQuery({ queryKey: ["chat-history"], queryFn: chatApi.history, staleTime: 0 });
  const goals = useQuery({ queryKey: ["goals"], queryFn: goalsApi.list });

  const [text, setText] = useState("");
  const [goalId, setGoalId] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [failedText, setFailedText] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState(DEFAULT_DISCLAIMER);
  const [confirmClear, setConfirmClear] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = history.data ?? [];

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending]);

  const send = useMutation({
    mutationFn: (message: string) => chatApi.send(message, goalId || null),
    onSuccess: (res) => {
      queryClient.setQueryData<ChatMsg[]>(["chat-history"], (old) => [...(old ?? []), res.userMessage, res.reply]);
      setDisclaimer(res.disclaimer || DEFAULT_DISCLAIMER);
      setPending(null);
      setFailedText(null);
      inputRef.current?.focus();
    },
    onError: (e, message) => {
      setPending(null);
      setFailedText(message);
      // Never lose what the user typed: put it back unless they already started a new message.
      setText((current) => current || message);
      setError(getErrorCode(e) === "RATE_LIMITED" ? `${getErrorMessage(e)} Wait a moment, then press Retry.` : getErrorMessage(e));
    },
  });

  const clear = useMutation({
    mutationFn: chatApi.clear,
    onSuccess: () => {
      queryClient.setQueryData<ChatMsg[]>(["chat-history"], []);
      setDisclaimer(DEFAULT_DISCLAIMER);
      setError("");
      setFailedText(null);
      setConfirmClear(false);
    },
  });

  const submit = (raw: string) => {
    const message = raw.trim();
    if (!message || send.isPending) return;
    setError("");
    setText("");
    setPending(message);
    send.mutate(message);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit(text);
    }
  };

  const busy = send.isPending;
  const empty = !history.isLoading && messages.length === 0 && pending === null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Label htmlFor="chat-goal">Chat about</Label>
          <Select id="chat-goal" className="w-64 max-w-full" value={goalId} disabled={busy} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">General</option>
            {goals.data?.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </Select>
        </div>
        {confirmClear ? (
          <div role="alertdialog" aria-label="Confirm clearing the conversation" className="flex flex-wrap items-center gap-2 text-sm">
            <span>Delete the whole conversation?</span>
            <Button variant="destructive" size="sm" disabled={clear.isPending} onClick={() => clear.mutate()}>
              {clear.isPending ? "Clearing…" : "Yes, clear it"}
            </Button>
            <Button variant="outline" size="sm" disabled={clear.isPending} onClick={() => setConfirmClear(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" disabled={busy || messages.length === 0} onClick={() => setConfirmClear(true)}>
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Clear conversation
          </Button>
        )}
      </div>
      {clear.isError && <FormError message={getErrorMessage(clear.error)} />}

      <div
        ref={listRef}
        className="h-[55vh] min-h-[20rem] overflow-y-auto rounded-lg border bg-muted/30 p-4"
        aria-busy={history.isLoading || busy}
      >
        {history.isLoading && <ListSkeleton rows={3} />}
        {history.isError && <ErrorState error={history.error} onRetry={() => history.refetch()} />}
        {empty && !history.isError && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="space-y-1">
              <p className="font-medium">Ask HDOS AI about careers, skills and study options in Rwanda.</p>
              <p className="text-sm text-muted-foreground">Try one of these to get started:</p>
            </div>
            <ul className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => submit(s)}
                    className="rounded-full border bg-background px-3 py-1.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ul role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation" className="space-y-3">
          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} content={m.content} provider={m.provider} time={formatTime(m.createdAt)} />
          ))}
          {pending !== null && <Bubble role="user" content={pending} />}
          {busy && (
            <li className="flex justify-start" role="status">
              <div className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Ask HDOS AI is thinking…
              </div>
            </li>
          )}
        </ul>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          {failedText && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => submit(failedText)}>
              Retry
            </Button>
          )}
        </div>
      )}

      <form
        className="space-y-1"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
      >
        <Label htmlFor="chat-input" className="sr-only">Your message</Label>
        <div className="flex items-end gap-2">
          <Textarea
            id="chat-input"
            ref={inputRef}
            className="min-h-[56px] resize-none"
            rows={2}
            maxLength={MAX_LENGTH}
            placeholder="Type your question… (Enter to send, Shift+Enter for a new line)"
            aria-describedby="chat-counter"
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <Button type="submit" disabled={busy || !text.trim()} aria-label="Send message">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
        <p id="chat-counter" className={cn("text-right text-xs", text.length >= MAX_LENGTH ? "text-destructive" : "text-muted-foreground")}>
          {text.length}/{MAX_LENGTH}
        </p>
      </form>
      <p className="text-xs text-muted-foreground">{disclaimer}</p>
    </div>
  );
}
