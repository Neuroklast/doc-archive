import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { encryptSecret, hashState } from "@/server/crypto/secrets";
import { getDb } from "@/server/db";
import { oauthStates } from "@/server/db/schema";
import { googleAuthorizeUrl, pkceChallenge, randomOAuthState, googleConfig } from "@/server/google/oauth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  // Reject cross-site requests even if a session cookie is present.
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.BETTER_AUTH_URL ?? request.url).origin;
  if (!origin || origin !== expected) {
    return NextResponse.json({ error: "Ungültige Herkunft" }, { status: 403 });
  }
  try {
    googleConfig();
    const state = randomOAuthState();
    const verifier = randomOAuthState() + randomUUID().replaceAll("-", "");
    await getDb().insert(oauthStates).values({
      stateHash: hashState(state),
      userId: session.user.id,
      sessionId: session.session.id,
      verifierEncrypted: encryptSecret(verifier, `oauth-state:${session.user.id}`),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });
    return NextResponse.json({ authorizeUrl: googleAuthorizeUrl(state, pkceChallenge(verifier)) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Google Drive kann nicht verbunden werden. Konfiguration prüfen." }, { status: 503 });
  }
}
