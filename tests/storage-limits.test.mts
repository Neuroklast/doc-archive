import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PDF_BYTES, archiveTitle, pdfName, isExpectedHash, isUploadSize,
} from "../src/server/storage/limits.ts";

test("upload sizes are bounded on both sides", () => {
  assert.equal(isUploadSize(100), true);
  assert.equal(isUploadSize(MAX_PDF_BYTES), true);
  for (const value of [0, -1, 12.1, Infinity, NaN, MAX_PDF_BYTES + 1, "100"]) {
    assert.equal(isUploadSize(value), false);
  }
});

test("client checksum is a structured SHA-256 claim, not verified proof", () => {
  assert.equal(isExpectedHash("a".repeat(64)), true);
  assert.equal(isExpectedHash("a".repeat(63)), false);
  assert.equal(isExpectedHash("X".repeat(64)), false);
  assert.equal(isExpectedHash(123), false);
});

test("archive title and PDF name do not accept paths or control text", () => {
  assert.equal(archiveTitle("   "), null);
  assert.equal(archiveTitle(null), null);
  assert.equal(archiveTitle("  A\nB  "), "AB");
  assert.equal(pdfName("2026/11:Versicherung<>"), "2026-11-Versicherung--.pdf");
  assert.equal(pdfName("   "), "Dokument.pdf");
});
