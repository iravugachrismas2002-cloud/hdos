// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { createHash, randomBytes } from "node:crypto";

/** Cryptographically random, URL-safe token (raw value is only ever sent to the user). */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString("base64url");

/** Tokens are stored hashed so a database leak does not leak usable credentials. */
export const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");
