/**
 * Business photo storage.
 *
 * - On Vercel (or anywhere BLOB_READ_WRITE_TOKEN is set): Vercel Blob, private
 *   access. Photos are never public URLs; the API reads them and decides who
 *   may see them (see routes/storage.ts).
 * - Local development without a token: files on disk in LOCAL_UPLOAD_DIR
 *   (default ./.local-uploads), so the app works with no cloud account.
 *
 * Object paths stored in the database look like
 *   /objects/uploads/<ownerUserId>/<photoId>
 */
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, head, put } from "@vercel/blob";

export const MAX_IMAGE_BYTES = 215040;
export const PHOTO_CONTENT_TYPE = "image/webp";

const OBJECT_PATH = /^\/objects\/uploads\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/i;

export function isPhotoObjectPath(objectPath: string) {
  return OBJECT_PATH.test(objectPath);
}

export function photoObjectPath(ownerId: string, photoId: string) {
  return `/objects/uploads/${ownerId}/${photoId}`;
}

function blobPathname(objectPath: string) {
  if (!isPhotoObjectPath(objectPath)) throw new Error("Invalid photo path");
  return `${objectPath.slice("/objects/".length)}.webp`;
}

// On Vercel the Blob SDK signs in with either BLOB_READ_WRITE_TOKEN or the
// project's OIDC token plus BLOB_STORE_ID, both added when a store is connected.
function usingBlob() {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return true;
  if (process.env.VERCEL) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set. Connect a private Vercel Blob store to this project.");
  }
  return false;
}

function localPath(objectPath: string) {
  const root = path.resolve(process.env.LOCAL_UPLOAD_DIR || ".local-uploads");
  return path.join(root, blobPathname(objectPath));
}

export async function savePhoto(objectPath: string, bytes: Buffer) {
  if (usingBlob()) {
    await put(blobPathname(objectPath), bytes, {
      access: "private",
      contentType: PHOTO_CONTENT_TYPE,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
    return;
  }
  const file = localPath(objectPath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes, { flag: "wx" });
}

export async function photoInfo(objectPath: string): Promise<{ size: number; contentType: string } | null> {
  try {
    if (usingBlob()) {
      const info = await head(blobPathname(objectPath));
      return { size: info.size, contentType: info.contentType };
    }
    const info = await stat(localPath(objectPath));
    return { size: info.size, contentType: PHOTO_CONTENT_TYPE };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BLOB_READ_WRITE_TOKEN")) throw error;
    return null;
  }
}

export async function readPhoto(objectPath: string): Promise<Buffer | null> {
  try {
    if (usingBlob()) {
      const result = await get(blobPathname(objectPath), { access: "private" });
      if (!result || result.statusCode !== 200) return null;
      return Buffer.from(await new Response(result.stream).arrayBuffer());
    }
    return await readFile(localPath(objectPath));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BLOB_READ_WRITE_TOKEN")) throw error;
    return null;
  }
}
