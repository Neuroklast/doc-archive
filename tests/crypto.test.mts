import assert from "node:assert/strict";
import { test } from "node:test";
// Test design is intentionally standalone so it works without external services.
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

test("AES-GCM ciphertext roundtrips only with matching context", () => {
  const key = randomBytes(32);
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from("owner-1"));
  const encrypted = Buffer.concat([cipher.update("secret", "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAAD(Buffer.from("owner-1"));
  decipher.setAuthTag(tag);
  assert.equal(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(), "secret");
  const wrong = createDecipheriv("aes-256-gcm", key, nonce);
  wrong.setAAD(Buffer.from("owner-2"));
  wrong.setAuthTag(tag);
  assert.throws(() => Buffer.concat([wrong.update(encrypted), wrong.final()]));
});

test("SHA-256 state hash does not reveal the nonce", () => {
  const nonce = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(nonce).digest("hex");
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.ok(!hash.includes(nonce));
});
