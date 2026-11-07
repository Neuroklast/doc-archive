import { eq, and } from "drizzle-orm";
import { getSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { folders, storageConnections, uploadSessions } from "@/server/db/schema";
import { googleDriveAdapter } from "@/server/google/drive-adapter";
import { objectBody, privateJson, sameOrigin, smallJson } from "@/server/http/security";
import {
  archiveTitle, isExpectedHash, isUploadSize,
  pdfName, UPLOAD_SESSION_MINUTES, MAX_OCR_CHARS,
} from "@/server/storage/limits";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return privateJson({ error: "Nicht angemeldet" }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Ungültige Herkunft" }, 403);

  let input: Record<string, unknown> | null;
  try { input = objectBody(await smallJson(request, MAX_OCR_CHARS + 4096)); }
  catch { return privateJson({ error: "Ungültige Anfrage" }, 400); }

  const title = archiveTitle(input?.title);
  const bytes = input?.byteLength;
  const checksum = input?.sha256;
  const sender = input?.sender;
  const ocrText = input?.ocrText;
  const folderId = input?.folderId ?? null;
  if (!title || !isUploadSize(bytes) || !isExpectedHash(checksum) ||
      (sender != null && (typeof sender !== "string" || sender.length > 180)) ||
      (typeof ocrText !== "string" || ocrText.length > MAX_OCR_CHARS) ||
      (folderId !== null && (typeof folderId !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(folderId)))) {
    return privateJson({ error: "Ungültige Dokumentdaten, Dateigröße oder Prüfsumme" }, 400);
  }

  const db = getDb();
  const [connection] = await db.select().from(storageConnections).where(and(
    eq(storageConnections.userId, session.user.id),
    eq(storageConnections.provider, "google_drive"),
  )).limit(1);
  if (!connection || connection.status !== "connected") {
    return privateJson({ error: "Bitte Google Drive zuerst verbinden" }, 409);
  }

  let targetFolderId = connection.rootFolderId;
  if (typeof folderId === "string") {
    const [target] = await db.select().from(folders).where(and(
      eq(folders.id, folderId), eq(folders.userId, session.user.id),
    )).limit(1);
    if (!target?.driveFolderId) {
      return privateJson({ error: "Zielordner ist noch nicht mit Google Drive synchronisiert" }, 409);
    }
    targetFolderId = target.driveFolderId;
  }

  const [ticket] = await db.insert(uploadSessions).values({
    userId: session.user.id,
    connectionId: connection.id,
    status: "pending",
    expectedBytes: bytes,
    expectedSha256: checksum,
    title, sender: typeof sender === "string" && sender.trim() ? sender.trim() : null,
    ocrText,
    folderId: typeof folderId === "string" ? folderId : null,
    expiresAt: new Date(Date.now() + UPLOAD_SESSION_MINUTES * 60_000),
  }).returning({ id: uploadSessions.id });

  try {
    const grant = await googleDriveAdapter.beginUpload({
      connection: { id: connection.id, ownerUserId: session.user.id, provider: "google_drive" },
      uploadSessionId: ticket.id,
      targetFolder: { connectionId: connection.id, providerFolderId: targetFolderId },
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
