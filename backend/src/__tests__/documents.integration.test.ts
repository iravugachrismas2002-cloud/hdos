// Route integration tests for the authenticated applicant document vault.
// Database and encrypted-storage adapters are isolated so these run without external services.
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const documents: Record<string, Record<string, unknown>> = {};
  const storage = { configured: true };
  const prisma = {
    applicantDocument: {
      findMany: vi.fn(async () => Object.values(documents).filter((row) => !row.deletedAt)),
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId?: string; deletedAt?: null } }) => {
        const row = documents[where.id];
        if (!row || (where.deletedAt === null && row.deletedAt) || (where.userId && row.userId !== where.userId)) return null;
        return row;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { ...data, createdAt: new Date(), deletedAt: null };
        documents[String(data.id)] = row;
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        documents[where.id] = { ...documents[where.id], ...data };
        return documents[where.id];
      }),
    },
    applicantDocumentVersion: { create: vi.fn(async ({ data }: { data: unknown }) => data) },
    documentExtraction: { create: vi.fn(async ({ data }: { data: unknown }) => data), updateMany: vi.fn() },
    documentAccessLog: { create: vi.fn(async ({ data }: { data: unknown }) => data) },
    applicationDocument: { count: vi.fn(async () => 0) },
    $transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma)),
  };
  return {
    documents,
    storage,
    prisma,
    putDocument: vi.fn(async (_userId: string, id: string) => `private/${id}.enc`),
    getDocument: vi.fn(async () => Buffer.from("%PDF-1.7\nprivate PDF content")),
    deleteDocument: vi.fn(async () => undefined),
    scanWithClamAv: vi.fn(async () => undefined),
  };
});

vi.mock("../lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../modules/applications/document-storage", () => ({
  putDocument: mocks.putDocument,
  getDocument: mocks.getDocument,
  deleteDocument: mocks.deleteDocument,
  scanWithClamAv: mocks.scanWithClamAv,
  sha256: (data: Buffer) => `sha256-${data.length}`,
}));
vi.mock("../config/env", () => {
  const env = {
    NODE_ENV: "test",
    PORT: 5000,
    isProd: false,
    isTest: true,
    JWT_SECRET: "document-vault-test-secret",
    FRONTEND_URL: "http://localhost:3000",
    REQUIRE_EMAIL_VERIFICATION: false,
    corsOrigins: ["http://localhost:3000"],
    DOCUMENT_STORAGE_DIR: "./test-private-documents",
    DOCUMENT_MAX_BYTES: 10 * 1024 * 1024,
    CLAMAV_HOST: "test-scanner",
    CLAMAV_PORT: 3310,
    TRUST_PROXY_HOPS: 1,
    ANALYTICS_MIN_COHORT: 10,
  } as Record<string, unknown>;
  Object.defineProperty(env, "DOCUMENT_ENCRYPTION_CONFIGURED", { get: () => mocks.storage.configured });
  return { env };
});

const pdf = Buffer.from("%PDF-1.7\nHDOS test document\n%%EOF");
const aliceId = "vault-owner-alice";
const bobId = "vault-user-bob";
const upload = (app: import("express").Application, token: string, content = pdf, contentType = "application/pdf") =>
  request(app)
    .post("/api/applications/documents")
    .set("Authorization", `Bearer ${token}`)
    .set("Content-Type", contentType)
    .set("X-File-Name", "resume.pdf")
    .set("X-Document-Kind", "CV")
    .send(content);

describe("applicant document vault integration", () => {
  let app: import("express").Application;
  let aliceToken: string;
  let bobToken: string;

  beforeAll(async () => {
    const [{ createApp }, { signAccessToken }] = await Promise.all([
      import("../app"),
      import("../middleware/auth"),
    ]);
    app = createApp();
    aliceToken = signAccessToken(aliceId, "STUDENT");
    bobToken = signAccessToken(bobId, "STUDENT");
  });

  afterEach(() => {
    for (const id of Object.keys(mocks.documents)) delete mocks.documents[id];
    mocks.putDocument.mockClear();
    mocks.getDocument.mockClear();
    mocks.deleteDocument.mockClear();
    mocks.scanWithClamAv.mockClear();
    mocks.storage.configured = true;
  });

  it("accepts and records a valid PDF upload", async () => {
    const res = await upload(app, aliceToken);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ kind: "CV", fileName: "resume.pdf", status: "UPLOADED", verified: false });
    expect(mocks.scanWithClamAv).toHaveBeenCalledWith(pdf);
    expect(mocks.putDocument).toHaveBeenCalledWith(aliceId, res.body.data.id, pdf);
    expect(mocks.prisma.applicantDocumentVersion.create).toHaveBeenCalledOnce();
  });

  it("rejects a non-PDF upload", async () => {
    const res = await upload(app, aliceToken, Buffer.from("not a PDF"), "application/octet-stream");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/PDF|document/i);
    expect(mocks.putDocument).not.toHaveBeenCalled();
  });

  it("rejects files larger than 10 MB", async () => {
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1, 0x41);
    const res = await upload(app, aliceToken, oversized);
    expect(res.status).toBe(413);
    expect(mocks.putDocument).not.toHaveBeenCalled();
  });

  it("allows the document owner to download the original PDF", async () => {
    const created = await upload(app, aliceToken);
    const id = created.body.data.id as string;
    const res = await request(app).get(`/api/applications/documents/${id}/download`).set("Authorization", `Bearer ${aliceToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["cache-control"]).toContain("no-store");
    expect(res.body).toEqual(Buffer.from("%PDF-1.7\nprivate PDF content"));
    expect(mocks.prisma.documentAccessLog.create).toHaveBeenCalledOnce();
  });

  it("returns 403 when a different authenticated user downloads the document", async () => {
    const created = await upload(app, aliceToken);
    const res = await request(app).get(`/api/applications/documents/${created.body.data.id}/download`).set("Authorization", `Bearer ${bobToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(mocks.getDocument).not.toHaveBeenCalled();
  });

  it("verifies the document object key after storage accepts an upload", async () => {
    const res = await upload(app, aliceToken);
    expect(res.status).toBe(201);
    expect(mocks.putDocument).toHaveBeenCalledOnce();
    expect(mocks.documents[res.body.data.id].storageKey).toBe(`private/${res.body.data.id}.enc`);
  });

  it.todo("verifies Cloudinary upload and returned asset metadata (Cloudinary storage is not implemented)");

  it("deletes the stored file and marks the vault record deleted", async () => {
    const created = await upload(app, aliceToken);
    const id = created.body.data.id as string;
    const res = await request(app).delete(`/api/applications/documents/${id}`).set("Authorization", `Bearer ${aliceToken}`);
    expect(res.status).toBe(204);
    expect(mocks.deleteDocument).toHaveBeenCalledWith(aliceId, id);
    expect(mocks.documents[id].deletedAt).toBeInstanceOf(Date);
  });

  it("returns 503 DOCUMENT_STORAGE_DISABLED when encryption storage is not configured", async () => {
    mocks.storage.configured = false;
    const res = await upload(app, aliceToken);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("DOCUMENT_STORAGE_DISABLED");
    expect(mocks.scanWithClamAv).not.toHaveBeenCalled();
    expect(mocks.putDocument).not.toHaveBeenCalled();
  });
});
