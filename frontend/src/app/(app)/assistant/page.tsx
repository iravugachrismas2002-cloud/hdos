// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { ChatWindow } from "@/components/ChatWindow";

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold">HDOS Assistant</h1>
        <p className="text-muted-foreground">
          Ask questions about careers, skills and education in Rwanda. Answers are written by AI (Gemini, with automatic fallback to
          other providers) and never change your scores.
        </p>
      </div>
      <ChatWindow />
    </div>
  );
}
