// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env";

const key = createHash("sha256").update(env.DOCUMENT_ENCRYPTION_KEY).digest();
const root = path.resolve(env.DOCUMENT_STORAGE_DIR);
const storagePath = (userId: string, id: string) => path.join(root, createHash("sha256").update(userId).digest("hex"), `${id}.enc`);
export const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");

export async function putDocument(userId: string, id: string, data: Buffer): Promise<string> {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const file = storagePath(userId, id); await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.concat([Buffer.from("HDOC1"), iv, cipher.getAuthTag(), encrypted]), { mode: 0o600 });
  return file;
}

export async function getDocument(userId: string, id: string): Promise<Buffer> {
  const payload = await readFile(storagePath(userId, id));
  if (payload.subarray(0, 5).toString() !== "HDOC1") throw new Error("Invalid encrypted document");
  const decipher = createDecipheriv("aes-256-gcm", key, payload.subarray(5, 17));
  decipher.setAuthTag(payload.subarray(17, 33));
  return Buffer.concat([decipher.update(payload.subarray(33)), decipher.final()]);
}

export async function deleteDocument(userId: string, id: string) { await rm(storagePath(userId, id), { force: true }); }

/** Fail closed: without a configured ClamAV daemon the caller must not accept the upload. */
export async function scanWithClamAv(data: Buffer): Promise<void> {
  if (!env.CLAMAV_HOST) throw new Error("Malware scanning is not configured");
  const net = await import("node:net");
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host: env.CLAMAV_HOST, port: env.CLAMAV_PORT });
    let response = ""; let sent = false;
    socket.setTimeout(15000, () => { socket.destroy(); reject(new Error("Malware scanner timed out")); });
    socket.on("connect", () => socket.write("zINSTREAM\0"));
    socket.on("data", (chunk) => {
      response += chunk.toString();
      if (!sent) { sent = true; const size = Buffer.alloc(4); size.writeUInt32BE(data.length); socket.write(Buffer.concat([size, data, Buffer.alloc(4)])); }
    });
    socket.on("end", () => response.includes("OK") ? resolve() : reject(new Error(response.includes("FOUND") ? "Malware detected" : "Malware scan failed")));
    socket.on("error", reject);
  });
}
