// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/http";
import { trackUsage } from "../../lib/usage";
import { authenticate, currentUserId } from "../../middleware/auth";
import { chatLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { AI_DISCLAIMER } from "../goals/explainer";
import { generateText } from "./ai.service";
import { buildSnapshot, CHAT_SYSTEM_PROMPT, fallbackReply, snapshotPrompt } from "./coach";

export const chatRouter = Router();
chatRouter.use(authenticate);

const HISTORY_TURNS = 8;
const MAX_STORED_MESSAGES = 200;

const sendSchema = z.object({
  message: z.string().trim().min(1, "Type a message").max(1000, "Message is too long (max 1000 characters)"),
  goalId: z.string().min(1).nullish(),
});

const toDto = (m: { id: string; role: "USER" | "ASSISTANT"; content: string; provider: string | null; createdAt: Date }) => ({
  id: m.id,
  role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
  content: m.content,
  provider: m.provider,
  createdAt: m.createdAt.toISOString(),
});

chatRouter.get(
  "/history",
  asyncHandler(async (req, res) => {
    const rows = await prisma.chatMessage.findMany({
      where: { userId: currentUserId(req) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ data: rows.reverse().map(toDto) });
  }),
);

chatRouter.delete(
  "/history",
  asyncHandler(async (req, res) => {
    await prisma.chatMessage.deleteMany({ where: { userId: currentUserId(req) } });
    res.status(204).end();
  }),
);

chatRouter.post(
  "/",
  chatLimiter,
  validate(sendSchema),
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const { message, goalId } = req.body as z.infer<typeof sendSchema>;
    const started = Date.now();

    // Ownership check: a goal id that is not yours is silently ignored instead of leaking context.
    const ownedGoal = goalId ? await prisma.goal.findFirst({ where: { id: goalId, userId }, select: { id: true } }) : null;

    const previous = await prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: HISTORY_TURNS });
    const history = previous.reverse().map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content }));

    const userRow = await prisma.chatMessage.create({ data: { userId, role: "USER", content: message, goalId: ownedGoal?.id ?? null } });

    // A snapshot failure must not take the chatbot down: fall back to an empty context.
    const snapshot = await buildSnapshot(userId, ownedGoal?.id).catch(() => null);
    const result = await generateText({
      feature: "chat",
      system: CHAT_SYSTEM_PROMPT,
      prompt: `${snapshot ? snapshotPrompt(snapshot) : "HDOS DATA: unavailable"}\n\nUSER MESSAGE:\n${message}`,
      history,
      temperature: 0.35,
      // Match answer depth to the question: short factual asks stay short; multi-part planning
      // and application questions get enough room for steps, documents and caveats.
      maxTokens: message.trim().split(/\s+/).length > 28 || /roadmap|plan|apply|application|requirements|compare|step.by.step/i.test(message) ? 900 : 420,
      maxChars: 4200,
      fallback: snapshot
        ? fallbackReply(message, snapshot)
        : "I could not load your HDOS data just now. Please try again in a moment, or browse careers and programmes on the Explore page.",
    });

    const assistantRow = await prisma.chatMessage.create({
      data: { userId, role: "ASSISTANT", content: result.text, provider: result.provider, goalId: ownedGoal?.id ?? null },
    });
    trackUsage({ kind: "CHAT", feature: "chat", provider: result.provider, success: true, latencyMs: Date.now() - started });

    // Keep storage bounded: drop the oldest messages beyond the cap.
    const stale = await prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, skip: MAX_STORED_MESSAGES, select: { id: true } });
    if (stale.length) await prisma.chatMessage.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });

    res.json({
      data: {
        userMessage: toDto(userRow),
        reply: toDto(assistantRow),
        generatedBy: result.generatedBy,
        provider: result.provider,
        disclaimer: AI_DISCLAIMER,
      },
    });
  }),
);
