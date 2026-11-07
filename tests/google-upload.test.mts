import { test } from "node:test";
import assert from "node:assert/strict";
import { transferToDrive } from "../src/lib/document/google-upload.ts";

const SESSION = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=synthetic";

test("rejects untrusted upload URLs without transferring bytes", async () => {
  await assert.rejects(
    transferToDrive("https://example.com/upload/drive/v3/files", new Blob(["data"])),
    /Ungültiges Upload-Ziel/,
  );
});

test("uploads only PDF bytes to a fixed Google origin and no access token", async () => {
  const original = globalThis.fetch;
  const requests: Array<{ url: string; method: string; authorization: string | null }> = [];
  globalThis.fetch = async (url, init) => {
    const headers = new Headers(init?.headers);
    requests.push({
      url: String(url),
      method: init?.method ?? "GET",
      authorization: headers.get("Authorization"),
    });
    return new Response("{}", { status: 200 });
  };
  try {
    await transferToDrive(SESSION, new Blob(["%PDF-1.7"]));
    assert.deepEqual(requests, [{ url: SESSION, method: "PUT", authorization: null }]);
  } finally {
    globalThis.fetch = original;
  }
});

test("queries accepted byte range before resuming an interrupted transfer", async () => {
  const original = globalThis.fetch;
  const headers: string[] = [];
  let attempt = 0;
  globalThis.fetch = async (_url, init) => {
    attempt++;
    const h = new Headers(init?.headers);
    headers.push(h.get("Content-Range") ?? "");
    if (attempt === 1) throw new TypeError("network interrupted");
    if (attempt === 2) return new Response(null, { status: 308, headers: { Range: "bytes=0-4" } });
    return new Response("{}", { status: 201 });
  };
  try {
    await transferToDrive(SESSION, new Blob(["%PDF-1.7"]));
    assert.deepEqual(headers, ["", "bytes */8", "bytes 5-7/8"]);
  } finally {
    globalThis.fetch = original;
  }
});
