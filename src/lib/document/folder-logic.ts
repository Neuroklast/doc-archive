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

