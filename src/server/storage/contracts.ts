/**
 * DOC ARCHIVE: framework-independent, server-side provider interface.
 * Contract only. No OAuth credentials, network integration or adapters implemented.
 * Application services MUST check authenticated owner and connection before calls.
 */
export type StorageProviderId = "google_drive" | "cloudflare_r2";

export type StorageIntegrityLevel =
  | "unverified"
  | "provider_metadata"
  | "content_sha256";

export type StorageConnectionRef = Readonly<{
  id: string;
  ownerUserId: string;
  provider: StorageProviderId;
}>;

export type StorageFolderRef = Readonly<{
  connectionId: string;
  providerFolderId: string;
}>;

export type StorageObjectRef = Readonly<{
  connectionId: string;
  provider: StorageProviderId;
  providerObjectId: string;
}>;

export type UploadStartInput = Readonly<{
  connection: StorageConnectionRef;
  uploadSessionId: string;
  targetFolder: StorageFolderRef;
  proposedFileName: string;
  contentType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  byteLength: number;
  /** User-provided SHA-256 is not proof of stored content integrity. */
  expectedSha256: string;
}>;

export type UploadGrant =
  | Readonly<{
      kind: "google_drive_resumable";
      provider: "google_drive";
      uploadSessionId: string;
      sessionUri: string;
      appExpiresAt: string;
      chunkSizeMultiple: 262144;
    }>
  | Readonly<{
      kind: "r2_presigned_put";
      provider: "cloudflare_r2";
      uploadSessionId: string;
      url: string;
      appExpiresAt: string;
      requiredHeaders: Readonly<Record<string, string>>;
    }>;

export type StoredObjectVerification = Readonly<{
  object: StorageObjectRef;
  contentType: string;
  byteLength: number;
  integrity: StorageIntegrityLevel;
  confirmedSha256?: string;
  providerChecksum?: string;
  verifiedAt: string;
}>;

export type StorageObjectMetadata = Readonly<{
  object: StorageObjectRef;
  name: string;
  contentType: string;
  byteLength: number;
  trashedOrMissing: boolean;
  providerFolderId?: string;
}>;

export interface StorageProviderAdapter {
  readonly provider: StorageProviderId;

  createFolder(args: Readonly<{
    connection: StorageConnectionRef;
    name: string;
    parent?: StorageFolderRef;
    /** Internal UUID persisted before provider creation, for recovery. */
    clientFolderId?: string;
  }>): Promise<StorageFolderRef>;

  beginUpload(input: UploadStartInput): Promise<UploadGrant>;

  verifyUpload(args: Readonly<{
    connection: StorageConnectionRef;
    uploadSessionId: string;
    expectedObject?: StorageObjectRef;
  }>): Promise<StoredObjectVerification>;

  getMetadata(args: Readonly<{
    connection: StorageConnectionRef;
    object: StorageObjectRef;
  }>): Promise<StorageObjectMetadata>;

  openReadStream(args: Readonly<{
    connection: StorageConnectionRef;
    object: StorageObjectRef;
  }>): Promise<ReadableStream<Uint8Array>>;

  rename(args: Readonly<{
    connection: StorageConnectionRef;
    object: StorageObjectRef;
    newName: string;
  }>): Promise<void>;

  move(args: Readonly<{
    connection: StorageConnectionRef;
    object: StorageObjectRef;
    destination: StorageFolderRef;
  }>): Promise<void>;

  delete(args: Readonly<{
    connection: StorageConnectionRef;
    object: StorageObjectRef;
  }>): Promise<void>;
}

/** Optional provider capability: Drive has a feed; R2 can reconcile periodically. */
export interface StorageChangeFeed {
  getStartCursor(connection: StorageConnectionRef): Promise<string>;
  listChanges(args: Readonly<{
    connection: StorageConnectionRef;
    cursor: string;
    maxResults: number;
  }>): Promise<Readonly<{
    changes: readonly StorageChange[];
    nextCursor?: string;
    newStartCursor?: string;
  }>>;
}

export type StorageChange = Readonly<{
  providerObjectId: string;
  type: "created" | "updated" | "removed" | "unknown";
}>;
