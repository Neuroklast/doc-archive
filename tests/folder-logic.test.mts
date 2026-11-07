import assert from "node:assert/strict";
import { test } from "node:test";
import { depthOf, folderName, validFolderId } from "../src/server/folders/logic.ts";

test("folder names reject traversal and path separators", () => {
  for (const bad of ["", ".", "..", "a/b", "a\\b", "x\nname", " ".repeat(8)]) {
    assert.equal(folderName(bad), null);
  }
  assert.equal(folderName("  Behörden "), "Behörden");
  assert.equal(validFolderId("a"), false);
});

test("depth rejects missing parents, cycles and excessive nesting", () => {
  assert.equal(depthOf(null, []), 1);
  assert.equal(depthOf("a", [{ id: "a", parentId: null }]), 2);
  assert.throws(() => depthOf("b", [{ id: "a", parentId: null }]));
  assert.throws(() => depthOf("a", [{ id: "a", parentId: "a" }]));
  const chain = Array.from({ length: 13 }, (_, i) => ({
    id: String(i), parentId: i ? String(i - 1) : null,
  }));
  assert.throws(() => depthOf("12", chain));
});
