import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { storageConnections } from "@/server/db/schema";
import { decryptSecret } from "@/server/crypto/secrets";
import { tokenContext } from "@/server/google/oauth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(process.env.BETTER_AUTH_URL ?? request.url).origin) {
    return NextResponse.json({ error: "Ungültige Herkunft" }, { status: 403 });
  }
  const db = getDb();
  const [connection] = await db.select().from(storageConnections).where(and(
    eq(storageConnections.userId, session.user.id),
    eq(storageConnections.provider, "google_drive"),
  )).limit(1);
  if (!connection) return NextResponse.json({ disconnected: true });
  try {
    const token = decryptSecret(
      connection.refreshTokenEncrypted,
      tokenContext(session.user.id, connection.providerAccountId),
    );
    const response = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok && response.status !== 400) throw new Error("Revoke failed");
    // Delete connection after successful or already-invalid revoke.
    // Future stored documents would require a separate disconnected state instead.
    await db.delete(storageConnections).where(eq(storageConnections.id, connection.id));
    return NextResponse.json({ disconnected: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Trennen fehlgeschlagen. Bitte erneut versuchen." }, { status: 502 });
  }
}
