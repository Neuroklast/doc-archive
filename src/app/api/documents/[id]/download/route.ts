import { and, desc, eq } from "drizzle-orm";
import { getSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { documents, documentVersions, storageConnections } from "@/server/db/schema";
import { googleDriveAdapter } from "@/server/google/drive-adapter";
import { privateJson } from "@/server/http/security";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return privateJson({ error: "Nicht angemeldet" }, 401);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return privateJson({ error: "Nicht gefunden" }, 404);

  const [result] = await getDb().select({
    title: documents.title,
    objectId: documentVersions.providerObjectId,
    connectionId: documentVersions.connectionId,
    ownerId: documents.userId,
    connectionOwner: storageConnections.userId,
    provider: storageConnections.provider,
  }).from(documents)
    .innerJoin(documentVersions, eq(documentVersions.documentId, documents.id))
    .innerJoin(storageConnections, eq(storageConnections.id, documentVersions.connectionId))
    .where(and(eq(documents.id, id), eq(documents.userId, session.user.id),
      eq(storageConnections.userId, session.user.id), eq(documents.status, "ready")))
    .orderBy(desc(documentVersions.createdAt)).limit(1);

  if (!result || result.provider !== "google_drive") return privateJson({ error: "Nicht gefunden" }, 404);

  try {
    const stream = await googleDriveAdapter.openReadStream({
      connection: { id: result.connectionId, ownerUserId: session.user.id, provider: "google_drive" },
      object: { connectionId: result.connectionId, provider: "google_drive", providerObjectId: result.objectId },
    });
    const download = new URL(request.url).searchParams.get("download") === "1";
    // Content-Disposition limits the possibility of inline execution of untrusted content.
    return new Response(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="document.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return privateJson({ error: "Google Drive nicht erreichbar. Verbindung überprüfen." }, 503);
  }
}
