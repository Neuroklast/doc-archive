export type FolderEntry = {
  id: string;
  name: string;
  parentId: string | null;
  ready: boolean;
};

export type FolderTreeEntry = FolderEntry & {
  depth: number;
  path: string;
};

export function flattenFolders(folders: readonly FolderEntry[]): FolderTreeEntry[] {
  const children = new Map<string | null, FolderEntry[]>();
  const ids = new Set(folders.map(folder => folder.id));
  for (const folder of folders) {
    const key = folder.parentId && ids.has(folder.parentId) ? folder.parentId : null;
    const current = children.get(key) ?? [];
    current.push(folder);
    children.set(key, current);
  }
  const collator = new Intl.Collator("de", { sensitivity: "base" });
  for (const list of children.values()) list.sort((a, b) => collator.compare(a.name, b.name));

  const result: FolderTreeEntry[] = [];
  const visited = new Set<string>();
  function collect(parentId: string | null, depth: number, path: string) {
    for (const folder of children.get(parentId) ?? []) {
      if (visited.has(folder.id)) continue;
      visited.add(folder.id);
      const nextPath = path ? `${path} / ${folder.name}` : folder.name;
      result.push({ ...folder, depth, path: nextPath });
      if (depth < 12) collect(folder.id, depth + 1, nextPath);
    }
  }
  collect(null, 0, "");
  // Malformed/cyclic DB records must not make the UI disappear or recurse forever.
  for (const folder of folders) {
    if (!visited.has(folder.id)) result.push({ ...folder, depth: 0, path: folder.name });
  }
  return result;
}
