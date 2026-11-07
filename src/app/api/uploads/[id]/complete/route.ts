import { and, eq, gt } from "drizzle-orm";
import { getSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import {
  documents, documentOcr, documentVersions, storageConnections, uploadSessions,
} from "@/server/db/schema";
import { googleDriveAdapter } from "@/server/google/drive-adapter";
import { privateJson, sameOrigin } from "@/server/http/security";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return privateJson({ error: "Nicht angemeldet" }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Ungültige Herkunft" }, 403);

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return privateJson({ error: "Ungültiger Upload" }, 400);

  const db = getDb();
  const [ticket] = await db.select().from(uploadSessions).where(and(
    eq(uploadSessions.id, id),
    eq(uploadSessions.userId, session.user.id),
  )).limit(1);
  if (!ticket) return privateJson({ error: "Upload nicht gefunden" }, 404);
  if (ticket.status === "ready" && ticket.documentId) return privateJson({ documentId: ticket.documentId, ready: true });
  // The browser grant expires sooner than Google Drive's upload session.
  // Recovery stays possible for up to 7 days when Drive has the complete file.
  const recoveryUntil = ticket.createdAt.getTime() + 7 * 24 * 60 * 60_000;
  if (ticket.status !== "uploading" || Date.now() > recoveryUntil) {
    return privateJson({ error: "Upload ist nicht mehr wiederherstellbar" }, 409);
  }

  const [connection] = await db.select().from(storageConnections).where(and(
    eq(storageConnections.id, ticket.connectionId),
    eq(storageConnections.userId, session.user.id),
    eq(storageConnections.provider, "google_drive"),
  )).limit(1);
  if (!connection || connection.status !== "connected") {
    return privateJson({ error: "Google Drive muss erneut verbunden werden" }, 409);
  }

  let confirmed: Awaited<ReturnType<typeof googleDriveAdapter.verifyUpload>>;
  try {
    confirmed = await googleDriveAdapter.verifyUpload({
      connection: { id: connection.id, ownerUserId: session.user.id, provider: "google_drive" },
      uploadSessionId: ticket.id,
    });
  } catch {
    // Keep ticket retriable in case Drive has not indexed the file yet.
    return privateJson({ error: "Drive-Upload konnte noch nicht bestätigt werden. Erneut versuchen." }, 409);
  }

  try {
    const documentId = await db.transaction(async tx => {
      // Claim completion with a conditional update to exclude double finalization.
      const [claimed] = await tx.update(uploadSessions).set({ status: "finalizing" }).where(and(
        eq(uploadSessions.id, ticket.id),
        eq(uploadSessions.userId, session.user.id),
        eq(uploadSessions.status, "uploading"),
        gt(uploadSessions.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60_000)),
      )).returning({ id: uploadSessions.id });
      if (!claimed) throw new Error("Ticket already finalized");

      const [document] = await tx.insert(documents).values({
        userId: session.user.id,
        title: ticket.title,
        sender: ticket.sender,
        folderId: ticket.folderId,
        status: "ready",
      }).returning({ id: documents.id });
      await tx.insert(documentVersions).values({
        documentId: document.id,
        connectionId: connection.id,
        providerObjectId: confirmed.object.providerObjectId,
        kind: "optimized",
        mimeType: "application/pdf",
        bytes: confirmed.byteLength,
        sha256: ticket.expectedSha256,
        integrity: confirmed.integrity,
      });
      if (ticket.ocrText?.trim()) {
        await tx.insert(documentOcr).values({
          documentId: document.id,
          userId: session.user.id,
          text: ticket.ocrText!,
          language: "deu",
        });
      }
      await tx.update(uploadSessions).set({
        documentId: document.id,
        status: "ready",
        providerObjectId: confirmed.object.providerObjectId,
      }).where(eq(uploadSessions.id, ticket.id));
      return document.id;
    });
    return privateJson({ ready: true, documentId });
  } catch {
    const [completed] = await db.select().from(uploadSessions).where(
      and(eq(uploadSessions.id, ticket.id), eq(uploadSessions.userId, session.user.id)),
    ).limit(1);
    if (completed?.status === "ready" && completed.documentId) {
      return privateJson({ ready: true, documentId: completed.documentId });
    }
    return privateJson({ error: "Archivierung noch nicht abgeschlossen. Erneut versuchen." }, 409);
  }
}
