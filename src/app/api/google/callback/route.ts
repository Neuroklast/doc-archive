import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { decryptSecret, encryptSecret, hashState } from "@/server/crypto/secrets";
import { getDb } from "@/server/db";
import { oauthStates, storageConnections } from "@/server/db/schema";
import {
  DRIVE_SCOPE, exchangeGoogleCode, getDriveAccount,
  createDriveRoot, tokenContext,
} from "@/server/google/oauth";

export const runtime = "nodejs";

function back(request: Request, result: string) {
  return NextResponse.redirect(new URL(`/archive?drive=${result}`, request.url), {
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const session = await getSession();
  if (!session || !state || !code || state.length > 250 || code.length > 4096) {
    return back(request, "failed");
  }
  const db = getDb();
  // Consume the nonce only once and bind it to the original Better Auth session.
  const [attempt] = await db.update(oauthStates).set({ usedAt: new Date() }).where(and(
    eq(oauthStates.stateHash, hashState(state)),
    eq(oauthStates.userId, session.user.id),
    eq(oauthStates.sessionId, session.session.id),
    isNull(oauthStates.usedAt),
    gt(oauthStates.expiresAt, new Date()),
  )).returning();

  if (!attempt) return back(request, "failed");

  try {
    const verifier = decryptSecret(attempt.verifierEncrypted, `oauth-state:${session.user.id}`);
    const tokens = await exchangeGoogleCode(code, verifier);
    if (!tokens.scope?.split(/\s+/).includes(DRIVE_SCOPE)) return back(request, "failed");
    const driveAccount = await getDriveAccount(tokens.access_token);

    const [existing] = await db.select().from(storageConnections).where(and(
      eq(storageConnections.userId, session.user.id),
      eq(storageConnections.provider, "google_drive"),
    )).limit(1);

    // Reject missing offline permission unless we already hold a token for this exact account.
    const canReuse = existing?.providerAccountId === driveAccount.id;
    if (!tokens.refresh_token && !canReuse) return back(request, "failed");

    const encrypted = tokens.refresh_token
      ? encryptSecret(tokens.refresh_token, tokenContext(session.user.id, driveAccount.id))
      : existing!.refreshTokenEncrypted;
    const rootFolderId = canReuse
      ? existing!.rootFolderId
      : await createDriveRoot(tokens.access_token);

    await db.insert(storageConnections).values({
      userId: session.user.id,
      provider: "google_drive",
      providerAccountId: driveAccount.id,
      displayName: driveAccount.displayName,
      rootFolderId,
      refreshTokenEncrypted: encrypted,
      status: "connected",
    }).onConflictDoUpdate({
      target: [storageConnections.userId, storageConnections.provider],
      set: {
        providerAccountId: driveAccount.id,
        displayName: driveAccount.displayName,
        rootFolderId,
        refreshTokenEncrypted: encrypted,
        status: "connected",
        updatedAt: new Date(),
      },
    });
    return back(request, "connected");
  } catch {
    return back(request, "failed");
  }
}
