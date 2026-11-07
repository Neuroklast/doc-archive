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
        before: async (candidate) => {
          const owner = process.env.ARCHIVE_OWNER_EMAIL?.trim().toLowerCase();
          // Fail closed: private personal archive, not open self-registration.
          if (!owner || candidate.email.toLowerCase() !== owner) return false;
          return { data: candidate };
        },
      },
    },
  },
});
