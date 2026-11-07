import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import { folders, storageConnections } from "@/server/db/schema";
import { googleDriveAdapter } from "@/server/google/drive-adapter";

export const MAX_FOLDER_DEPTH = 12;
export const MAX_FOLDER_COUNT = 250;

export function folderName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.normalize("NFC").trim();
  if (!name || name.length > 90 || name === "." || name === ".." ||
      /[\\/\x00-\x1F\x7F]/.test(name)) return null;
  return name;
}

export function validFolderId(input: unknown): input is string {
  return typeof input === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
}

export type FolderRow = typeof folders.$inferSelect;

export function depthOf(parentId: string | null, rows: readonly Pick<FolderRow, "id" | "parentId">[]): number {
  const byId = new Map(rows.map(row => [row.id, row.parentId]));
  let id = parentId;
  let depth = 1;
  const visited = new Set<string>();
  while (id) {
    if (visited.has(id) || !byId.has(id)) throw new Error("Invalid folder parent tree");
    visited.add(id);
    depth++;
    id = byId.get(id) ?? null;
    if (depth > MAX_FOLDER_DEPTH) throw new Error("Maximum folder depth exceeded");
  }
  return depth;
}

export async function materializeFolder(
  ownerId: string,
  targetId: string,
): Promise<Pick<FolderRow, "id" | "name" | "parentId" | "driveFolderId">> {
  const db = getDb();
  const [connection] = await db.select().from(storageConnections).where(and(
    eq(storageConnections.userId, ownerId),
    eq(storageConnections.provider, "google_drive"),
  )).limit(1);
  if (!connection || connection.status !== "connected") {
    throw new Error("Google Drive is not connected");
  }
  const [target] = await db.select().from(folders).where(and(
    eq(folders.id, targetId), eq(folders.userId, ownerId),
  )).limit(1);
  if (!target) throw new Error("Folder not found");
  if (target.driveFolderId) return target;

  let parentDriveId = connection.rootFolderId;
  if (target.parentId) {
    const [parent] = await db.select().from(folders).where(and(
      eq(folders.id, target.parentId), eq(folders.userId, ownerId),
    )).limit(1);
    if (!parent?.driveFolderId) throw new Error("Parent folder is not synchronized");
    parentDriveId = parent.driveFolderId;
  }

  const linked = await googleDriveAdapter.createFolder({
    connection: { id: connection.id, ownerUserId: ownerId, provider: "google_drive" },
    parent: { connectionId: connection.id, providerFolderId: parentDriveId },
    clientFolderId: target.id,
    name: target.name,
  });

  const [updated] = await db.update(folders)
    .set({ driveFolderId: linked.providerFolderId, updatedAt: new Date() })
    .where(and(eq(folders.id, target.id), eq(folders.userId, ownerId), isNull(folders.driveFolderId)))
    .returning();
  if (updated) return updated;
  const [resolved] = await db.select().from(folders).where(and(
    eq(folders.id, target.id), eq(folders.userId, ownerId),
  )).limit(1);
  if (!resolved?.driveFolderId || resolved.driveFolderId !== linked.providerFolderId) {
    throw new Error("Folder synchronization conflict");
  }
  return resolved;
}
