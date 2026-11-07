import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { documents, storageConnections } from "@/server/db/schema";
import ArchiveShell from "./shell";

export const dynamic = "force-dynamic";

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ drive?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const db = getDb();
  const [connections, entries] = await Promise.all([
    db.select({
      status: storageConnections.status,
      displayName: storageConnections.displayName,
      rootFolderId: storageConnections.rootFolderId,
    }).from(storageConnections).where(eq(storageConnections.userId, session.user.id)).limit(1),
    db.select({
      id: documents.id, title: documents.title, sender: documents.sender,
      status: documents.status, createdAt: documents.createdAt,
    }).from(documents).where(eq(documents.userId, session.user.id))
      .orderBy(desc(documents.createdAt)).limit(25),
  ]);

  const params = await searchParams;
  const notice = params.drive === "failed" ? "Google Drive konnte nicht verbunden werden. Prüfe die Berechtigungen und versuche es erneut." :
    params.drive === "different_account" ? "Ein anderes Google-Konto ist bereits verbunden. Ein Kontowechsel würde bestehende Dateiverknüpfungen beschädigen." :
    params.drive === "connected" ? "Google Drive wurde verbunden." : null;

  return <ArchiveShell
    notice={notice}
    displayName={session.user.name}
    connected={connections[0]?.status === "connected"}
    connectionStatus={connections[0]?.status ?? "not_connected"}
    accountLabel={connections[0]?.displayName ?? null}
    documents={entries.map(item => ({
      ...item, createdAt: item.createdAt.toISOString(),
    }))}
  />;
}
