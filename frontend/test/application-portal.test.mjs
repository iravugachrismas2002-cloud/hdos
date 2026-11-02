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

test("opportunity explorer links to verified job, scholarship, learning and business sources", async () => {
  const page = await readFile(new URL("../src/app/(app)/explore/page.tsx", import.meta.url), "utf8");
  const api = await readFile(new URL("../src/lib/api.ts", import.meta.url), "utf8");
  assert.match(page, /Opportunity sources/);
  assert.match(page, /Open provider site/);
  assert.match(page, /not synchronized into HDOS automatically/);
  assert.match(api, /opportunity-sources/);
});
