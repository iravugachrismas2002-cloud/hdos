// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { Router } from "express";
import { asyncHandler } from "../../lib/http";
import { authenticate, currentUserId } from "../../middleware/auth";
import { aiLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { getGuidance } from "../ai/guidance";
import {
  createGoal,
  createGoalSchema,
  deleteGoal,
  explainGoal,
  generateRoadmap,
  getGoal,
  getRecommendations,
  getRoadmap,
  listGoals,
  stepStatusSchema,
  updateGoal,
  updateGoalSchema,
  updateStepStatus,
} from "./goals.service";

export const goalsRouter = Router();

// Every route is owner-only; the service layer scopes each query by the authenticated user id.
goalsRouter.use(authenticate);

goalsRouter.get("/", asyncHandler(async (req, res) => {
  res.json({ data: await listGoals(currentUserId(req)) });
}));

goalsRouter.post("/", validate(createGoalSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await createGoal(currentUserId(req), req.body) });
}));

goalsRouter.get("/:id", asyncHandler(async (req, res) => {
  res.json({ data: await getGoal(currentUserId(req), req.params.id) });
}));

goalsRouter.patch("/:id", validate(updateGoalSchema), asyncHandler(async (req, res) => {
  res.json({ data: await updateGoal(currentUserId(req), req.params.id, req.body) });
}));

goalsRouter.delete("/:id", asyncHandler(async (req, res) => {
  await deleteGoal(currentUserId(req), req.params.id);
  res.status(204).end();
}));

goalsRouter.get("/:id/recommendations", asyncHandler(async (req, res) => {
  res.json({ data: await getRecommendations(currentUserId(req), req.params.id) });
}));

goalsRouter.get("/:id/roadmap", asyncHandler(async (req, res) => {
  res.json({ data: { roadmap: await getRoadmap(currentUserId(req), req.params.id) } });
}));

goalsRouter.post("/:id/roadmap", asyncHandler(async (req, res) => {
  res.json({ data: { roadmap: await generateRoadmap(currentUserId(req), req.params.id) } });
}));

goalsRouter.patch("/:id/roadmap/steps/:stepId", validate(stepStatusSchema), asyncHandler(async (req, res) => {
  res.json({ data: await updateStepStatus(currentUserId(req), req.params.id, req.params.stepId, req.body.status) });
}));

goalsRouter.post("/:id/guidance", aiLimiter, asyncHandler(async (req, res) => {
  res.json({ data: await getGuidance(currentUserId(req), req.params.id) });
}));

goalsRouter.post("/:id/explain", aiLimiter, asyncHandler(async (req, res) => {
  res.json({ data: await explainGoal(currentUserId(req), req.params.id) });
}));
