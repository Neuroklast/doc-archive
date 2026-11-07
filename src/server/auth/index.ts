import { timingSafeEqual } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "@/server/db";
import * as schema from "@/server/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), { provider: "pg", schema }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
  },
  rateLimit: { enabled: true, window: 60, max: 10 },
  databaseHooks: {
    user: {
      create: {
        before: async (candidate, ctx) => {
          const owner = process.env.ARCHIVE_OWNER_EMAIL?.trim().toLowerCase();
          const expected = process.env.ARCHIVE_SETUP_SECRET ?? "";
          const supplied = ctx.request?.headers.get("x-archive-setup-token") ?? "";
          // Owning the email address alone is not sufficient to seize initial registration.
          if (!owner || candidate.email.toLowerCase() !== owner ||
              expected.length < 32 || supplied.length !== expected.length ||
              !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) return false;
          return { data: candidate };
        },
      },
    },
  },
});
