import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("application portal exposes tracked applications and the document vault", async () => {
  const page = await readFile(new URL("../src/app/(app)/applications/page.tsx", import.meta.url), "utf8");
  const vault = await readFile(new URL("../src/components/DocumentVault.tsx", import.meta.url), "utf8");
  assert.match(page, /Application centre/);
  assert.match(vault, /HDOS APPLICANT DOCUMENT VAULT/);
  assert.match(vault, /Upload document/);
  assert.match(vault, /Confirm extracted text/);
  assert.match(vault, /Download/);
  assert.match(vault, /Delete/);
});

test("application portal keeps applicant approval in the workflow", async () => {
  const page = await readFile(new URL("../src/app/(app)/applications/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Approve application/);
  assert.match(page, /Record confirmed submission/);
});
