import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env.STORAGE_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("STORAGE_TOKEN_ENCRYPTION_KEY is not configured");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) throw new Error("STORAGE_TOKEN_ENCRYPTION_KEY must be 32 bytes in base64");
  return decoded;
}

/** AES-256-GCM with random 96-bit nonce and authenticated context. */
export function encryptSecret(secret: string, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context));
  const bytes = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), bytes.toString("base64url")].join(".");
}

export function decryptSecret(payload: string, context: string): string {
  const [version, nonce, tag, body, extra] = payload.split(".");
  if (version !== "v1" || !nonce || !tag || !body || extra) throw new Error("Invalid encrypted secret format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(nonce, "base64url"));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}

export function hashState(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
