import { and, eq, isNull } from "drizzle-orm";
import { getSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { folders } from "@/server/db/schema";
import { depthOf, folderName, materializeFolder, MAX_FOLDER_COUNT, validFolderId } from "@/server/folders/logic";
import { objectBody, privateJson, sameOrigin, smallJson } from "@/server/http/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return privateJson({ error: "Nicht angemeldet" }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Ungültige Herkunft" }, 403);
  let input: Record<string, unknown> | null;
  try { input = objectBody(await smallJson(request)); }
  catch { return privateJson({ error: "Ungültige Anfrage" }, 400); }

  const name = folderName(input?.name);
  const parentId = input?.parentId == null || input.parentId === "" ? null : input.parentId;
  if (!name || (parentId !== null && !validFolderId(parentId))) {
    return privateJson({ error: "Ungültiger Ordnername oder Elternordner" }, 400);
  }
  const db = getDb();
  const existing = await db.select().from(folders).where(eq(folders.userId, session.user.id));
  if (existing.length >= MAX_FOLDER_COUNT) return privateJson({ error: "Zu viele Ordner" }, 409);
  if (parentId && !existing.some(row => row.id === parentId && !!row.driveFolderId)) {
    return privateJson({ error: "Übergeordneter Ordner nicht verfügbar" }, 409);
  }
  try {
    depthOf(parentId, existing);
  } catch {
    return privateJson({ error: "Maximale Ordnertiefe erreicht" }, 409);
  }

  const duplicate = existing.find(row =>
    row.parentId === parentId &&
    row.name.toLocaleLowerCase("de") === name.toLocaleLowerCase("de"));
  if (duplicate) {
    return privateJson({ error: duplicate.driveFolderId
      ? "Dieser Ordner existiert bereits" : "Ordner noch nicht synchronisiert. Erneut versuchen." }, 409);
  }

  const [saved] = await db.insert(folders).values({
    userId: session.user.id, name, parentId,
  }).returning();
  try {
    const result = await materializeFolder(session.user.id, saved.id);
    return privateJson({ folder: { id: result.id, name: result.name,
      parentId: result.parentId, ready: !!result.driveFolderId } }, 201);
  } catch {
    // Keep the pending DB row and deterministic Drive marker for safe retry.
    return privateJson({
      error: "Ordner konnte nicht vollständig erstellt werden. Er kann erneut synchronisiert werden.",
      folderId: saved.id,
    }, 503);
  }
}
