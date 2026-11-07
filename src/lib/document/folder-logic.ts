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

export function depthOf(parentId: string | null, rows: readonly { id: string; parentId: string | null }[]): number {
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

