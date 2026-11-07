import assert from "node:assert/strict";
import { test } from "node:test";
import { flattenFolders } from "../src/lib/document/folder-tree.ts";

test("folders appear as a stable ordered hierarchy", () => {
  const output = flattenFolders([
    { id: "3", parentId: "1", name: "Sub", ready: true },
    { id: "2", parentId: null, name: "Versicherungen", ready: true },
    { id: "1", parentId: null, name: "Behörden", ready: true },
  ]);
  assert.deepEqual(output.map(x => [x.id, x.depth, x.path]), [
    ["1", 0, "Behörden"], ["3", 1, "Behörden / Sub"], ["2", 0, "Versicherungen"],
  ]);
});

test("broken hierarchy does not cause infinite recursion", () => {
  assert.equal(flattenFolders([{ id: "1", parentId: "1", name: "Cycle", ready: false }]).length, 1);
  assert.equal(flattenFolders([{ id: "2", parentId: "gone", name: "Orphan", ready: false }]).length, 1);
});
