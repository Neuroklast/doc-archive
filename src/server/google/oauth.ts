import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { storageConnections } from "@/server/db/schema";
import { decryptSecret } from "@/server/crypto/secrets";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export function googleConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth is not configured");
  }
  return { clientId, clientSecret, redirectUri };
}

export function randomOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function googleAuthorizeUrl(state: string, challenge: string): string {
  const cfg = googleConfig();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    include_granted_scopes: "false",
    prompt: "consent",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  expires_in?: number;
  token_type?: string;
};

export async function exchangeGoogleCode(code: string, verifier: string): Promise<TokenResponse> {
  const cfg = googleConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      code_verifier: verifier,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) throw new Error("Google OAuth token exchange failed");
  const parsed: unknown = await response.json();
  if (!parsed || typeof parsed !== "object" || !("access_token" in parsed) ||
      typeof parsed.access_token !== "string") throw new Error("Google token response invalid");
  return parsed as TokenResponse;
}

export async function driveRequest(
  accessToken: string, path: string, init: RequestInit = {},
): Promise<Response> {
  const url = new URL(path, "https://www.googleapis.com/drive/v3/");
  if (url.origin !== "https://www.googleapis.com") throw new Error("Invalid Drive API URL");
  return fetch(url, {
    ...init, cache: "no-store",
    signal: AbortSignal.timeout(12000),
    headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
  });
}

export async function getDriveAccount(accessToken: string): Promise<{
  id: string; displayName: string | null;
}> {
  const response = await driveRequest(accessToken, "about?fields=user(permissionId,displayName)");
  if (!response.ok) throw new Error("Cannot verify connected Drive account");
  const raw: unknown = await response.json();
  if (!raw || typeof raw !== "object" || !("user" in raw) ||
      !raw.user || typeof raw.user !== "object" ||
      !("permissionId" in raw.user) || typeof raw.user.permissionId !== "string") {
    throw new Error("Drive account identity unavailable");
  }
  const name = "displayName" in raw.user && typeof raw.user.displayName === "string"
    ? raw.user.displayName : null;
  return { id: raw.user.permissionId, displayName: name };
}

export async function createDriveRoot(accessToken: string): Promise<string> {
  const response = await driveRequest(accessToken, "files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "DOC ARCHIVE",
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!response.ok) throw new Error("Google Drive folder creation failed");
  const raw: unknown = await response.json();
  if (!raw || typeof raw !== "object" || !("id" in raw) ||
      typeof raw.id !== "string") throw new Error("Drive folder ID missing");
  return raw.id;
}

export function tokenContext(userId: string, driveAccountId: string): string {
  return `google-drive:${userId}:${driveAccountId}`;
}

export async function getDriveAccessToken(userId: string): Promise<string> {
  const db = getDb();
  const [connection] = await db.select().from(storageConnections).where(
    and(eq(storageConnections.userId, userId), eq(storageConnections.provider, "google_drive")),
  ).limit(1);
  if (!connection || connection.status !== "connected") {
    throw new Error("Google Drive needs reconnection");
  }
  const cfg = googleConfig();
  const token = decryptSecret(
    connection.refreshTokenEncrypted, tokenContext(userId, connection.providerAccountId),
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(12000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId, client_secret: cfg.clientSecret,
      refresh_token: token, grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      await db.update(storageConnections).set({ status: "needs_reconnect" }).where(
        eq(storageConnections.id, connection.id),
      );
    }
    throw new Error("Google Drive token refresh failed");
  }
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("access_token" in body) ||
      typeof body.access_token !== "string") throw new Error("Google token refresh invalid");
  return body.access_token;
}
