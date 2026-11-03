// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { z } from "zod";
import type { Goal, GoalCategory, GoalStatus, Prisma, StepStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import {
  toOccupation,
  toOpportunity,
  toProgram,
  toSourceRef,
} from "../../lib/mappers";
import {
  ENGINE_VERSION,
  pickTarget,
  rankOccupations,
  scoreOpportunity,
  scoreProgram,
} from "../../engine/pathwayFit";
import { planRoadmap, progressOf } from "../../engine/roadmapPlanner";
import type { OccupationFit } from "../../engine/types";
import { loadEngineContext, type EngineContext } from "./engineContext";
import { AI_DISCLAIMER, explainPathway, type ExplainEvidence } from "./explainer";
import { writeRoadmapSummary } from "../ai/roadmapNarrative";
import { trackUsage } from "../../lib/usage";

const CATEGORIES = ["EDUCATION", "CAREER", "ENTREPRENEURSHIP", "SKILLS", "INCOME", "STUDY_ABROAD"] as const;
const MAX_ACTIVE_GOALS = 10;

export const createGoalSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  category: z.enum(CATEGORIES),
  description: z.string().trim().max(1000).nullish(),
  targetDate: z.coerce.date().refine((d) => d.getTime() > Date.now(), "Target date must be in the future").nullish(),
  targetOccupationId: z.string().min(1).nullish(),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"]).optional(),
});

export const stepStatusSchema = z.object({ status: z.enum(["TODO", "IN_PROGRESS", "DONE", "SKIPPED"]) });

type GoalWithRelations = Goal & {
  targetOccupation: { id: string; title: string } | null;
  roadmap: { steps: { status: StepStatus }[] } | null;
};

const goalInclude = {
  targetOccupation: { select: { id: true, title: true } },
  roadmap: { select: { steps: { select: { status: true } } } },
} satisfies Prisma.GoalInclude;

const toGoalDto = (g: GoalWithRelations) => ({
  id: g.id,
  title: g.title,
  description: g.description,
  category: g.category,
  status: g.status,
  targetDate: g.targetDate?.toISOString() ?? null,
  targetOccupation: g.targetOccupation,
  progress: g.roadmap ? progressOf(g.roadmap.steps.map((s) => s.status)) : null,
  createdAt: g.createdAt.toISOString(),
});

/** Ownership is part of every query: a goal that is not yours simply does not exist. */
const findOwnedGoal = async (userId: string, goalId: string) => {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId }, include: goalInclude });
  if (!goal) throw AppError.notFound("Goal not found");
  return goal;
};

const assertOccupationExists = async (id: string | null | undefined) => {
  if (!id) return;
  const found = await prisma.occupation.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw AppError.badRequest("Unknown target occupation", "VALIDATION_ERROR", [{ field: "targetOccupationId", message: "Unknown occupation" }]);
};

export const listGoals = async (userId: string) => {
  const goals = await prisma.goal.findMany({ where: { userId }, include: goalInclude, orderBy: { createdAt: "desc" } });
  return goals.map(toGoalDto);
};

export const getGoal = async (userId: string, goalId: string) => toGoalDto(await findOwnedGoal(userId, goalId));

export const createGoal = async (userId: string, input: z.infer<typeof createGoalSchema>) => {
  const active = await prisma.goal.count({ where: { userId, status: "ACTIVE" } });
  if (active >= MAX_ACTIVE_GOALS) {
    throw AppError.conflict(`You can have at most ${MAX_ACTIVE_GOALS} active goals`, "GOAL_LIMIT");
  }
  await assertOccupationExists(input.targetOccupationId);
  const goal = await prisma.goal.create({
    data: {
      userId,
      title: input.title,
      category: input.category as GoalCategory,
      description: input.description || null,
      targetDate: input.targetDate ?? null,
      targetOccupationId: input.targetOccupationId ?? null,
    },
    include: goalInclude,
  });
  return toGoalDto(goal);
};

export const updateGoal = async (userId: string, goalId: string, input: z.infer<typeof updateGoalSchema>) => {
  await findOwnedGoal(userId, goalId);
  await assertOccupationExists(input.targetOccupationId);
  const goal = await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.category !== undefined && { category: input.category as GoalCategory }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.targetDate !== undefined && { targetDate: input.targetDate }),
      ...(input.targetOccupationId !== undefined && { targetOccupationId: input.targetOccupationId }),
      ...(input.status !== undefined && { status: input.status as GoalStatus }),
    },
    include: goalInclude,
  });
  return toGoalDto(goal);
};

export const deleteGoal = async (userId: string, goalId: string) => {
  await findOwnedGoal(userId, goalId);
  await prisma.goal.delete({ where: { id: goalId } });
};

// ───────────────────────── Analysis shared by recommendations, roadmap, explanation ─────────────────────────

interface Analysis {
  ctx: EngineContext;
  fits: OccupationFit[];
  target: OccupationFit | undefined;
  programFits: ReturnType<typeof scoreProgram>[];
  opportunityFits: NonNullable<ReturnType<typeof scoreOpportunity>>[];
}

const analyse = async (userId: string, goal: Pick<Goal, "title" | "category" | "targetOccupationId">): Promise<Analysis> => {
  const ctx = await loadEngineContext(userId);
  const fits = rankOccupations(ctx.profile, ctx.occupationInputs);
  const target = pickTarget(fits, ctx.occupationInputs, goal.title, goal.targetOccupationId);
  const gaps = target?.missingSkills ?? [];
  const skillNames = new Map(gaps.map((g) => [g.skillId, g.name]));

  const programFits = ctx.programInputs
    .map((p) => scoreProgram(ctx.profile, p, gaps, target?.occupationId ?? null, skillNames))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || a.programId.localeCompare(b.programId));

  const opportunityFits = ctx.opportunityInputs
    .map((o) => scoreOpportunity(ctx.profile, o, goal.category))
    .filter((o): o is NonNullable<typeof o> => o !== null)
    .sort((a, b) => b.score - a.score || a.opportunityId.localeCompare(b.opportunityId));

  return { ctx, fits, target, programFits, opportunityFits };
};

const humanize = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export const getRecommendations = async (userId: string, goalId: string) => {
  const goal = await findOwnedGoal(userId, goalId);
  const { ctx, fits, target, programFits, opportunityFits } = await analyse(userId, goal);

  // Explicit target first, then the best of the rest.
  const ordered = target ? [target, ...fits.filter((f) => f.occupationId !== target.occupationId)] : fits;
  const occupationById = new Map(ctx.occupations.map((o) => [o.id, o]));
  const programById = new Map(ctx.programs.map((p) => [p.id, p]));
  const opportunityById = new Map(ctx.opportunities.map((o) => [o.id, o]));

  const occupations = ordered.slice(0, 5).flatMap((fit) => {
    const row = occupationById.get(fit.occupationId);
    if (!row) return [];
    const evidence: { label: string; value: string; source: ReturnType<typeof toSourceRef> | null }[] = [
      { label: "Labour demand", value: humanize(row.demand), source: row.source ? toSourceRef(row.source) : null },
      { label: "Skill coverage", value: `${Math.round(fit.components.skillCoverage * 100)}%`, source: null },
    ];
    if (row.salaryMinRwf !== null && row.salaryMaxRwf !== null) {
      evidence.push({
        label: "Verified salary range",
        value: `${row.salaryMinRwf.toLocaleString("en-US")} - ${row.salaryMaxRwf.toLocaleString("en-US")} RWF / month`,
        source: row.source ? toSourceRef(row.source) : null,
      });
    }
    if (row.sector.nst2Priority) evidence.push({ label: "National priority sector", value: row.sector.name, source: null });
    return [{ occupation: toOccupation(row), ...fit, fitScore: fit.fitScore, evidence }];
  });

  const programs = programFits.slice(0, 5).flatMap((fit) => {
    const row = programById.get(fit.programId);
    return row ? [{ program: toProgram(row), score: fit.score, closesGaps: fit.closesGaps, reasons: fit.reasons }] : [];
  });

  const opportunities = opportunityFits.slice(0, 6).flatMap((fit) => {
    const row = opportunityById.get(fit.opportunityId);
    return row ? [{ opportunity: toOpportunity(row), score: fit.score, eligibleNow: fit.eligibleNow, reasons: fit.reasons }] : [];
  });

  trackUsage({ kind: "RECOMMENDATION", feature: "goal_recommendations" });

  const notes: string[] = [];
  if (ctx.profile.completeness < 55) notes.push("Complete your profile (education, skills, interests) to get sharper, higher-confidence matches.");
  if (ctx.profile.skills.length === 0) notes.push("You have not added any skills yet, so skill fit is calculated as zero for every occupation.");
  if (!ctx.occupations.length) notes.push("No occupation data has been loaded yet. Ask an administrator to run the data seed.");
  if (opportunities.length && !opportunities.some((o) => o.eligibleNow)) notes.push("You do not meet the minimum education for the listed opportunities yet; see the roadmap for the education step.");

  return {
    engineVersion: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    profileCompleteness: ctx.profile.completeness,
    occupations,
    programs,
    opportunities,
    notes,
    disclaimer: AI_DISCLAIMER,
  };
};

// ───────────────────────── Roadmap ─────────────────────────

const stepKey = (s: { kind: string; refId: string | null; title: string }) => `${s.kind}|${s.refId ?? s.title}`;

const roadmapInclude = { steps: { orderBy: { order: "asc" as const } } };

const toRoadmapDto = (r: Prisma.RoadmapGetPayload<{ include: typeof roadmapInclude }>) => ({
  id: r.id,
  goalId: r.goalId,
  summary: r.summary,
  engineVersion: r.engineVersion,
  generatedAt: r.generatedAt.toISOString(),
  progress: progressOf(r.steps.map((s) => s.status)),
  steps: r.steps.map((s) => ({
    id: s.id,
    order: s.order,
    phase: s.phase,
    title: s.title,
    description: s.description,
    kind: s.kind,
    monthOffset: s.monthOffset,
    status: s.status,
    ref: s.refType && s.refId && s.refLabel ? { type: s.refType, id: s.refId, label: s.refLabel } : null,
  })),
});

export const getRoadmap = async (userId: string, goalId: string) => {
  await findOwnedGoal(userId, goalId);
  const roadmap = await prisma.roadmap.findUnique({ where: { goalId }, include: roadmapInclude });
  return roadmap ? toRoadmapDto(roadmap) : null;
};

export const generateRoadmap = async (userId: string, goalId: string) => {
  const goal = await findOwnedGoal(userId, goalId);
  const { ctx, target, programFits, opportunityFits } = await analyse(userId, goal);
  if (!target) throw AppError.conflict("No occupation data is available yet to build a roadmap", "NO_CATALOG_DATA");

  const targetRow = ctx.occupationInputs.find((o) => o.id === target.occupationId);
  if (!targetRow) throw AppError.conflict("Target occupation is unavailable", "NO_CATALOG_DATA");

  const programRows = new Map(ctx.programs.map((p) => [p.id, p]));
  const opportunityRows = new Map(ctx.opportunities.map((o) => [o.id, o]));

  const horizonMonths = goal.targetDate
    ? Math.round((goal.targetDate.getTime() - Date.now()) / (30 * 86_400_000))
    : 12;

  const plan = planRoadmap({
    profile: ctx.profile,
    target: { id: targetRow.id, title: targetRow.title, minEducation: targetRow.minEducation },
    fit: target,
    programs: programFits.slice(0, 5).flatMap((fit) => {
      const row = programRows.get(fit.programId);
      return row ? [{ fit, name: row.name, institution: row.institution.name }] : [];
    }),
    opportunities: opportunityFits.slice(0, 5).flatMap((fit) => {
      const row = opportunityRows.get(fit.opportunityId);
      return row ? [{ fit, title: row.title, provider: row.provider, type: row.type }] : [];
    }),
    horizonMonths,
  });

  const narrative = await writeRoadmapSummary({
    goalTitle: goal.title,
    targetTitle: targetRow.title,
    horizonMonths: horizonMonths,
    steps: plan.steps.map((s) => ({ phase: s.phase, title: s.title, kind: s.kind })),
    plannerSummary: plan.summary,
  });

  const previous = await prisma.roadmap.findUnique({ where: { goalId }, include: { steps: true } });
  // Regenerating must not wipe the user's progress: carry over the status of unchanged steps.
  const carried = new Map((previous?.steps ?? []).map((s) => [stepKey(s), s.status]));

  const created = await prisma.$transaction(async (tx) => {
    if (previous) await tx.roadmap.delete({ where: { id: previous.id } });
    return tx.roadmap.create({
      data: {
        goalId,
        summary: narrative.text,
        engineVersion: ENGINE_VERSION,
        steps: {
          create: plan.steps.map((s) => ({
            order: s.order,
            phase: s.phase,
            title: s.title,
            description: s.description,
            kind: s.kind,
            monthOffset: s.monthOffset,
            refType: s.ref?.type ?? null,
            refId: s.ref?.id ?? null,
            refLabel: s.ref?.label ?? null,
            status: carried.get(stepKey({ kind: s.kind, refId: s.ref?.id ?? null, title: s.title })) ?? "TODO",
          })),
        },
      },
      include: roadmapInclude,
    });
  }, { maxWait: 15_000, timeout: 30_000 });
  trackUsage({ kind: "ROADMAP", feature: "goal_roadmap", provider: narrative.provider });
  return toRoadmapDto(created);
};

export const updateStepStatus = async (userId: string, goalId: string, stepId: string, status: StepStatus) => {
  const step = await prisma.roadmapStep.findFirst({
    where: { id: stepId, roadmap: { goalId, goal: { userId } } },
    select: { id: true, roadmapId: true },
  });
  if (!step) throw AppError.notFound("Step not found");

  await prisma.roadmapStep.update({ where: { id: step.id }, data: { status } });
  const steps = await prisma.roadmapStep.findMany({ where: { roadmapId: step.roadmapId }, orderBy: { order: "asc" } });
  const updated = steps.find((s) => s.id === step.id);
  return { step: updated ? { id: updated.id, status: updated.status } : { id: step.id, status }, progress: progressOf(steps.map((s) => s.status)) };
};

// ───────────────────────── Explanation ─────────────────────────

export const explainGoal = async (userId: string, goalId: string) => {
  const goal = await findOwnedGoal(userId, goalId);
  const { ctx, target, programFits } = await analyse(userId, goal);
  if (!target) throw AppError.conflict("No occupation data is available yet", "NO_CATALOG_DATA");

  const targetRow = ctx.occupationInputs.find((o) => o.id === target.occupationId);
  const programRows = new Map(ctx.programs.map((p) => [p.id, p]));
  const evidence: ExplainEvidence = {
    goalTitle: goal.title,
    targetTitle: targetRow?.title ?? "the target occupation",
    fitScore: target.fitScore,
    band: target.band,
    confidence: target.confidence,
    profileCompleteness: ctx.profile.completeness,
    components: Object.fromEntries(Object.entries(target.components).map(([k, v]) => [k, Math.round(v * 100)])),
    missingSkills: target.missingSkills.slice(0, 4).map((s) => ({ name: s.name, currentLevel: s.currentLevel, requiredLevel: s.requiredLevel })),
    topPrograms: programFits.slice(0, 2).flatMap((f) => {
      const row = programRows.get(f.programId);
      return row ? [{ name: row.name, institution: row.institution.name }] : [];
    }),
    notes: [],
  };
  return explainPathway(evidence);
};
