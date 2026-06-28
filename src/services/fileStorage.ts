// src/services/fileStorage.ts
//
// Uploaded images/videos go into Postgres, not local disk — Render's free
// web service filesystem is wiped on every redeploy, which is why uploaded
// content was disappearing. Files are served back via GET /files/:id.
import { prisma } from "../db";

export async function storeFile(mimeType: string, data: Buffer): Promise<string> {
  const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  await prisma.uploadedFile.create({ data: { id, mimeType, data } });
  return `/files/${id}`;
}
