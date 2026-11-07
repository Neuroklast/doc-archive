import { and, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { documents, storageConnections } from "@/server/db/schema";
import ArchiveShell from "./shell";

export const dynamic = "force-dynamic";

type Search = Promise<{ drive?: string; q?: string; page?: string }>;
const PAGE_SIZE = 25;

export default async function ArchivePage({ searchParams }: { searchParams: Search }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const pageNumber = Number(params.page);
  const page = Number.isSafeInteger(pageNumber) && pageNumber > 0 && pageNumber <= 10000 ? pageNumber : 1;

  const db = getDb();
  const filter = q
    ? and(eq(documents.userId, session.user.id), sql`(
      ${documents.title} ILIKE ${"%" + q + "%"}
      OR COALESCE(${documents.sender}, '') ILIKE ${"%" + q + "%"}
      OR EXISTS (
        SELECT 1 FROM document_ocr AS o
        WHERE o.document_id = ${documents.id}
          AND o.user_id = ${session.user.id}
          AND to_tsvector('german', o.text) @@ websearch_to_tsquery('german', ${q})
      )
    )`)
    : eq(documents.userId, session.user.id);

  const [connections, entries, totals] = await Promise.all([
    db.select({
      status: storageConnections.status,
      displayName: storageConnections.displayName,
    }).from(storageConnections).where(eq(storageConnections.userId, session.user.id)).limit(1),
    db.select({
      id: documents.id, title: documents.title, sender: documents.sender,
      status: documents.status, createdAt: documents.createdAt,
    }).from(documents).where(filter)
      .orderBy(desc(documents.createdAt), desc(documents.id))
      .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: sql<number>`count(*)::int` }).from(documents).where(filter),
  ]);

  const notice = params.drive === "failed"
    ? "Google Drive konnte nicht verbunden werden. Bitte Berechtigung prüfen."
    : params.drive === "different_account"
      ? "Ein anderes Google-Konto ist bereits verbunden. Kontowechsel würde Dateiverknüpfungen beschädigen."
      : params.drive === "connected" ? "Google Drive wurde verbunden." : null;
  const total = totals[0]?.total ?? 0;

  return <ArchiveShell
    notice={notice}
    displayName={session.user.name}
    connected={connections[0]?.status === "connected"}
    connectionStatus={connections[0]?.status ?? "not_connected"}
    accountLabel={connections[0]?.displayName ?? null}
    documents={entries.map(item => ({ ...item, createdAt: item.createdAt.toISOString() }))}
    total={total}
    query={q}
    page={page}
    pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
  />;
}
