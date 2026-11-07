import { eq, and } from "drizzle-orm";
import { getSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { storageConnections, uploadSessions } from "@/server/db/schema";
import { googleDriveAdapter } from "@/server/google/drive-adapter";
import { objectBody, privateJson, sameOrigin, smallJson } from "@/server/http/security";
import {
  archiveTitle, isExpectedHash, isUploadSize,
  pdfName, UPLOAD_SESSION_MINUTES,
} from "@/server/storage/limits";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return privateJson({ error: "Nicht angemeldet" }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Ungültige Herkunft" }, 403);

  let input: Record<string, unknown> | null;
  try { input = objectBody(await smallJson(request)); }
  catch { return privateJson({ error: "Ungültige Anfrage" }, 400); }

  const title = archiveTitle(input?.title);
  const bytes = input?.byteLength;
  const checksum = input?.sha256;
  if (!title || !isUploadSize(bytes) || !isExpectedHash(checksum)) {
    return privateJson({ error: "Ungültiger PDF-Titel, Dateigröße oder Prüfsumme" }, 400);
  }

  const db = getDb();
  const [connection] = await db.select().from(storageConnections).where(and(
    eq(storageConnections.userId, session.user.id),
    eq(storageConnections.provider, "google_drive"),
  )).limit(1);
  if (!connection || connection.status !== "connected") {
    return privateJson({ error: "Bitte Google Drive zuerst verbinden" }, 409);
  }

  const [ticket] = await db.insert(uploadSessions).values({
    userId: session.user.id,
    connectionId: connection.id,
    status: "pending",
    expectedBytes: bytes,
    expectedSha256: checksum,
    expiresAt: new Date(Date.now() + UPLOAD_SESSION_MINUTES * 60_000),
  }).returning({ id: uploadSessions.id });

  try {
    const grant = await googleDriveAdapter.beginUpload({
      connection: { id: connection.id, ownerUserId: session.user.id, provider: "google_drive" },
      uploadSessionId: ticket.id,
      targetFolder: { connectionId: connection.id, providerFolderId: connection.rootFolderId },
      proposedFileName: pdfName(title),
      contentType: "application/pdf",
      byteLength: bytes,
      expectedSha256: checksum,
    });
    await db.update(uploadSessions).set({ status: "uploading" }).where(
      and(eq(uploadSessions.id, ticket.id), eq(uploadSessions.userId, session.user.id)),
    );
    return privateJson(grant, 201);
  } catch {
    await db.update(uploadSessions).set({ status: "failed" }).where(
      eq(uploadSessions.id, ticket.id),
    );
    return privateJson({ error: "Google Drive konnte den Upload nicht starten" }, 502);
  }
}
