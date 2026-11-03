// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { Router } from "express";
import { asyncHandler } from "../../lib/http";
import { authenticate, currentUserId } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { avatarSchema, getProfile, profileSchema, saveAvatar, saveProfile } from "./profile.service";

export const profileRouter = Router();

// Every handler derives the user from the verified token, never from a request parameter, so a
// user can only ever read or write their own profile.
profileRouter.use(authenticate);

profileRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ data: { profile: await getProfile(currentUserId(req)) } });
  }),
);

profileRouter.put(
  "/",
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    res.json({ data: { profile: await saveProfile(currentUserId(req), req.body) } });
  }),
);

profileRouter.patch(
  "/avatar",
  validate(avatarSchema),
  asyncHandler(async (req, res) => {
    res.json({ data: { avatarData: await saveAvatar(currentUserId(req), req.body.avatarData ?? null) } });
  }),
);
