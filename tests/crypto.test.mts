import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret, hashState } from "../src/server/crypto/secrets.ts";

process.env.STORAGE_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");

test("encrypted tokens roundtrip only with matching account context", () => {
  const secret = "test-refresh-token";
  const encrypted = encryptSecret(secret, "google-drive:user-1:account-1");
  assert.notEqual(encrypted, secret);
  assert.equal(decryptSecret(encrypted, "google-drive:user-1:account-1"), secret);
  assert.throws(() => decryptSecret(encrypted, "google-drive:user-2:account-1"));
  assert.throws(() => decryptSecret(encrypted.slice(0, -1) + "X", "google-drive:user-1:account-1"));
});

test("OAuth state is stored by SHA-256 hash, not original nonce", () => {
  const nonce = randomBytes(32).toString("base64url");
  const hash = hashState(nonce);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.ok(!hash.includes(nonce));
  assert.equal(hashState(nonce), hash);
  assert.notEqual(hashState(nonce + "x"), hash);
});
