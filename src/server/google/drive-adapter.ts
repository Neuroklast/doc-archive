import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { storageConnections, uploadSessions } from "@/server/db/schema";
import { driveRequest, getDriveAccessToken } from "@/server/google/oauth";
import type {
  StorageConnectionRef, StorageFolderRef, StorageObjectRef,
  StorageProviderAdapter, StoredObjectVerification, StorageObjectMetadata,
  UploadGrant, UploadStartInput,
} from "@/server/storage/contracts";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  trashed: boolean;
  parents: string[];
  checksum?: string;
  uploadId?: string;
};

function readDriveFile(input: unknown): DriveFile {
  if (!input || typeof input !== "object") throw new Error("Invalid Drive file response");
  const obj = input as Record<string, unknown>;
  const size = Number(obj.size);
  if (typeof obj.id !== "string" || typeof obj.mimeType !== "string" ||
      !Number.isSafeInteger(size) || size < 0) throw new Error("Invalid Drive file metadata");
  const parents = Array.isArray(obj.parents) ? obj.parents.filter((p): p is string => typeof p === "string") : [];
  const properties = obj.appProperties;
  const appProps = properties && typeof properties === "object" ? properties as Record<string, unknown> : {};
  return {
    id: obj.id,
    name: typeof obj.name === "string" ? obj.name : "Dokument.pdf",
    mimeType: obj.mimeType,
    size,
    trashed: obj.trashed === true,
    parents,
    checksum: typeof obj.md5Checksum === "string" ? obj.md5Checksum : undefined,
    uploadId: typeof appProps.docArchiveUpload === "string" ? appProps.docArchiveUpload : undefined,
  };
}

export class GoogleDriveAdapter implements StorageProviderAdapter {
  readonly provider = "google_drive" as const;

  private async authorized(connection: StorageConnectionRef) {
    if (connection.provider !== this.provider) throw new Error("Storage provider mismatch");
    const [row] = await getDb().select().from(storageConnections).where(and(
      eq(storageConnections.id, connection.id),
      eq(storageConnections.userId, connection.ownerUserId),
      eq(storageConnections.provider, this.provider),
    )).limit(1);
    if (!row || row.status !== "connected") throw new Error("Google Drive must be reconnected");
    return { row, token: await getDriveAccessToken(connection.ownerUserId) };
  }

  async createFolder(args: Readonly<{ connection: StorageConnectionRef; name: string; parent?: StorageFolderRef }>): Promise<StorageFolderRef> {
    const { row, token } = await this.authorized(args.connection);
    if (args.parent && args.parent.connectionId !== row.id) throw new Error("Foreign storage folder");
    const parent = args.parent?.providerFolderId ?? row.rootFolderId;
    const res = await driveRequest(token, "files?fields=id", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: args.name.slice(0, 120), mimeType: "application/vnd.google-apps.folder", parents: [parent] }),
    });
    if (!res.ok) throw new Error("Drive folder creation failed");
    const metadata: unknown = await res.json();
    if (!metadata || typeof metadata !== "object" || !("id" in metadata) || typeof metadata.id !== "string") {
      throw new Error("Drive folder not confirmed");
    }
    return { connectionId: row.id, providerFolderId: metadata.id };
  }

  async beginUpload(input: UploadStartInput): Promise<UploadGrant> {
    const { row, token } = await this.authorized(input.connection);
    // The MVP uploads into the app-created root only; folder mapping follows later.
    if (input.targetFolder.connectionId !== row.id ||
        input.targetFolder.providerFolderId !== row.rootFolderId) throw new Error("Invalid upload folder");
    if (!/^[0-9a-f-]{36}$/i.test(input.uploadSessionId)) throw new Error("Invalid upload ticket");
    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": input.contentType,
        "X-Upload-Content-Length": String(input.byteLength),
      },
      body: JSON.stringify({
        name: input.proposedFileName,
        mimeType: input.contentType,
        parents: [row.rootFolderId],
        appProperties: { docArchiveUpload: input.uploadSessionId },
      }),
    });
    if (!res.ok) throw new Error("Drive upload session failed");
    const uri = res.headers.get("Location");
    if (!uri) throw new Error("Drive did not provide upload URI");
    const validated = new URL(uri);
    if (validated.protocol !== "https:" ||
        validated.hostname !== "www.googleapis.com" ||
        !validated.pathname.startsWith("/upload/drive/v3/files")) {
      throw new Error("Unexpected Google upload destination");
    }
    return {
      kind: "google_drive_resumable", provider: "google_drive",
      uploadSessionId: input.uploadSessionId,
      sessionUri: uri,
      appExpiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      chunkSizeMultiple: 262144,
    };
  }

  async verifyUpload(args: Readonly<{ connection: StorageConnectionRef; uploadSessionId: string; expectedObject?: StorageObjectRef }>): Promise<StoredObjectVerification> {
    const { row, token } = await this.authorized(args.connection);
    if (!/^[0-9a-f-]{36}$/i.test(args.uploadSessionId)) throw new Error("Invalid upload ticket");
    const [ticket] = await getDb().select().from(uploadSessions).where(and(
      eq(uploadSessions.id, args.uploadSessionId),
      eq(uploadSessions.userId, row.userId),
      eq(uploadSessions.connectionId, row.id),
    )).limit(1);
    if (!ticket) throw new Error("Upload ticket not found");
    // The random, server-generated ticket is stored in Drive appProperties at initiation.
    const query = `appProperties has { key='docArchiveUpload' and value='${ticket.id}' } and trashed = false`;
    const params = new URLSearchParams({
      q: query,
      fields: "nextPageToken,files(id,name,mimeType,size,trashed,parents,md5Checksum,appProperties)",
      pageSize: "2",
    });
    const res = await driveRequest(token, `files?${params.toString()}`);
    if (!res.ok) throw new Error("Cannot verify Drive upload");
    const raw: unknown = await res.json();
    if (!raw || typeof raw !== "object" || !("files" in raw) || !Array.isArray(raw.files)) {
      throw new Error("Invalid Drive upload lookup");
    }
    if (raw.files.length !== 1) throw new Error("Upload is missing or ambiguous");
    const file = readDriveFile(raw.files[0]);
    if (file.uploadId !== ticket.id || file.trashed ||
        !file.parents.includes(row.rootFolderId) ||
        file.mimeType !== "application/pdf" || file.size !== ticket.expectedBytes) {
      throw new Error("Drive upload metadata mismatch");
    }
    if (args.expectedObject && (args.expectedObject.connectionId !== row.id ||
        args.expectedObject.providerObjectId !== file.id ||
        args.expectedObject.provider !== this.provider)) throw new Error("Unexpected Drive file");
    // Verify actual bytes begin as PDF, not just the client/Drive-supplied MIME type.
    // Range avoids pulling entire sensitive documents through a Vercel function.
    const sample = await driveRequest(
      token, `files/${encodeURIComponent(file.id)}?alt=media`,
      { headers: { Range: "bytes=0-4" } },
    );
    if (!sample.ok || !sample.body) throw new Error("Cannot inspect Drive file bytes");
    const reader = sample.body.getReader();
    const marker: number[] = [];
    try {
      while (marker.length < 5) {
        const next = await reader.read();
        if (next.done) break;
        marker.push(...Array.from(next.value.subarray(0, 5 - marker.length)));
      }
    } finally {
      await reader.cancel();
    }
    if (new TextDecoder().decode(new Uint8Array(marker)) !== "%PDF-") {
      throw new Error("Drive upload does not contain a PDF header");
    }
    return {
      object: { connectionId: row.id, provider: this.provider, providerObjectId: file.id },
      contentType: file.mimeType, byteLength: file.size,
      integrity: "provider_metadata",
      providerChecksum: file.checksum,
      verifiedAt: new Date().toISOString(),
    };
  }

  async getMetadata(args: Readonly<{ connection: StorageConnectionRef; object: StorageObjectRef }>): Promise<StorageObjectMetadata> {
    const { row, token } = await this.authorized(args.connection);
    if (args.object.connectionId !== row.id || args.object.provider !== this.provider) throw new Error("Foreign storage object");
    const res = await driveRequest(token, `files/${encodeURIComponent(args.object.providerObjectId)}?fields=id,name,mimeType,size,parents,trashed`);
    if (!res.ok) throw new Error("Drive file not available");
    const file = readDriveFile(await res.json());
    return {
      object: args.object, name: file.name, contentType: file.mimeType,
      byteLength: file.size, trashedOrMissing: file.trashed,
      providerFolderId: file.parents[0],
    };
  }

  async openReadStream(args: Readonly<{ connection: StorageConnectionRef; object: StorageObjectRef }>): Promise<ReadableStream<Uint8Array>> {
    const { row, token } = await this.authorized(args.connection);
    if (args.object.connectionId !== row.id || args.object.provider !== this.provider) throw new Error("Foreign storage object");
    const res = await driveRequest(token, `files/${encodeURIComponent(args.object.providerObjectId)}?alt=media`);
    if (!res.ok || !res.body) throw new Error("Drive PDF download unavailable");
    return res.body;
  }

  async rename(args: Readonly<{ connection: StorageConnectionRef; object: StorageObjectRef; newName: string }>): Promise<void> {
    const { row, token } = await this.authorized(args.connection);
    if (args.object.connectionId !== row.id || args.object.provider !== this.provider) throw new Error("Foreign storage object");
    const res = await driveRequest(token, `files/${encodeURIComponent(args.object.providerObjectId)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: args.newName }),
    });
    if (!res.ok) throw new Error("Drive rename failed");
  }

  async move(args: Readonly<{ connection: StorageConnectionRef; object: StorageObjectRef; destination: StorageFolderRef }>): Promise<void> {
    const { row, token } = await this.authorized(args.connection);
    if (args.object.connectionId !== row.id || args.object.provider !== this.provider ||
        args.destination.connectionId !== row.id) throw new Error("Foreign storage object");
    const existing = await this.getMetadata({ connection: args.connection, object: args.object });
    const url = new URLSearchParams({ addParents: args.destination.providerFolderId, fields: "id,parents" });
    if (existing.providerFolderId) url.set("removeParents", existing.providerFolderId);
    const res = await driveRequest(token, `files/${encodeURIComponent(args.object.providerObjectId)}?${url.toString()}`, {
      method: "PATCH",
    });
    if (!res.ok) throw new Error("Drive move failed");
  }

  async delete(args: Readonly<{ connection: StorageConnectionRef; object: StorageObjectRef }>): Promise<void> {
    const { row, token } = await this.authorized(args.connection);
    if (args.object.connectionId !== row.id || args.object.provider !== this.provider) throw new Error("Foreign storage object");
    const res = await driveRequest(token, `files/${encodeURIComponent(args.object.providerObjectId)}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new Error("Drive deletion failed");
  }
}

export const googleDriveAdapter = new GoogleDriveAdapter();
