// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import type { Role } from "@prisma/client";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by the `authenticate` middleware. */
      auth?: { userId: string; role: Role };
    }
  }
}

export {};
