import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const expectedSourceHash = "6ea2706552b61ea12aa1ece9adfcd972ff312834ffd9cd5af2cc58c04e62185a";

test("preserva integralmente a ficha auditada e seu template de impressão", async () => {
  const file = await readFile(new URL("../public/ficha-uti/index.html", import.meta.url));
  const hash = createHash("sha256").update(file).digest("hex");

  assert.equal(hash, expectedSourceHash);
});

test("a ficha incorporada mantém o fluxo clínico e a impressão A4", async () => {
  const html = await readFile(new URL("../public/ficha-uti/index.html", import.meta.url), "utf8");

  assert.match(html, /@page\{size:A4 portrait;margin:6mm\}/);
  assert.match(html, /<table id="sheet">/);
  assert.match(html, /const MAX_SLOTS=10;/);
  assert.match(html, /Array\(6\)\.fill\(''\)/);
  assert.match(html, /id="applyAi"/);
  assert.match(html, /id="dashboardView"/);
  assert.match(html, /window\.print\(\)/);
});
