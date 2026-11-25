import { Readable } from 'stream';
import { getAuth } from '@clerk/express';
import {
  RequestBusinessPhotoUploadBody,
  RequestBusinessPhotoUploadResponse,
} from '@workspace/api-zod';
import { Router, type IRouter, type Request, type Response } from 'express';
import {
  arrayContains,
  db,
  businessesTable,
} from '@workspace/db';

import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';
import {
  findUser,
  getAccount,
  requireAccount,
  requireRole,
  requireSignedIn,
  resolveUserRole,
} from '../lib/authorization';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 * Requires auth middleware so public callers cannot mint write-capable URLs.
 */
router.post(
  '/storage/uploads/request-url',
  requireSignedIn,
  requireAccount,
  requireRole('student'),
  async (req: Request, res: Response) => {
    const parsed = RequestBusinessPhotoUploadBody.safeParse(req.body);
    if (!parsed.success || parsed.data.contentType !== 'image/webp' || parsed.data.size > 215040) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;
      const account = getAccount(res);
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(account.user.id);
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json(
        RequestBusinessPhotoUploadResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const relatedBusinesses = await db
      .select({
        ownerId: businessesTable.ownerId,
        status: businessesTable.status,
      })
      .from(businessesTable)
      .where(arrayContains(businessesTable.photoPaths, [objectPath]));
    if (!relatedBusinesses.length) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }

    let canReadPrivate = false;
    const auth = getAuth(req);
    if (auth.userId) {
      const user = await findUser(auth.userId);
      const claims = auth.sessionClaims as Record<string, unknown> | null;
      const email = typeof claims?.email === 'string' ? claims.email.trim().toLowerCase() : '';
      if (user && email) {
        const resolvedUser = await resolveUserRole(user, {
          authId: auth.userId,
          email,
          firstName: '',
          name: user.name,
        });
        canReadPrivate = relatedBusinesses.some(
          (business) => business.ownerId === resolvedUser.id,
        ) || resolvedUser.role === 'admin';
      }
    }
    const isPublic = relatedBusinesses.some((business) => business.status === 'live');
    if (!isPublic && !canReadPrivate) {
      res.status(403).json({ error: 'You do not have access to this photo.' });
      return;
    }

    const objectFile =
      await objectStorageService.getObjectEntityFile(objectPath);
    const [metadata] = await objectFile.getMetadata();
    const size = Number(metadata.size || 0);
    if (metadata.contentType !== 'image/webp' || size > 215040) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, 'Object not found');
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
