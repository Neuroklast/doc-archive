import { getSession } from "@/server/auth/session";
import { folderName, materializeFolder, validFolderId } from "@/server/folders/logic";
import { privateJson, sameOrigin } from "@/server/http/security";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return privateJson({ error: "Nicht angemeldet" }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Ungültige Herkunft" }, 403);
  const { id } = await context.params;
  if (!validFolderId(id)) return privateJson({ error: "Ungültiger Ordner" }, 400);
  try {
    const folder = await materializeFolder(session.user.id, id);
    if (!folderName(folder.name)) throw new Error("Invalid folder");
    return privateJson({ id: folder.id, ready: !!folder.driveFolderId });
  } catch {
    return privateJson({ error: "Ordner ist noch nicht synchronisiert. Google Drive prüfen." }, 503);
  }
}
