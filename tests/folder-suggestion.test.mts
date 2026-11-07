import assert from "node:assert/strict";
import { test } from "node:test";
import { suggestFolder } from "../src/lib/document/suggest-folder.ts";

const folders = [
  { id: "gov", name: "Behörden" }, { id: "insurance", name: "Versicherungen" },
  { id: "money", name: "Finanzen" }, { id: "contract", name: "Verträge" },
  { id: "health", name: "Gesundheit" },
];

test("suggests a folder only when there is strong local evidence", () => {
  assert.equal(suggestFolder("Kontoauszug", "", "", folders)?.id, "money");
  assert.equal(suggestFolder("Laborbericht", "", "", folders)?.id, "health");
  assert.equal(suggestFolder("Bescheid", "Finanzamt", "Vertrag", folders)?.id, "gov");
  assert.equal(suggestFolder("Eine Nachricht", "", "Steuererklärung", folders), null);
  assert.equal(suggestFolder("Eine Nachricht", "", "", folders), null);
});

test("suggestions use only existing folder IDs and do not fabricate paths", () => {
  assert.equal(suggestFolder("Kontoauszug", "", "", []), null);
  assert.equal(suggestFolder("Kontoauszug", "", "", folders.filter(x => x.id !== "money")), null);
  assert.equal(suggestFolder("Rechnung", "Krankenkasse", "", folders)?.id, "money"); 
});
