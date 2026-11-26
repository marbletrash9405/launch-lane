import { randomUUID } from 'node:crypto';
import { getAuth } from '@clerk/express';
import {
  RequestBusinessPhotoUploadBody,
  RequestBusinessPhotoUploadResponse,
} from '@workspace/api-zod';
import express, { Router, type IRouter, type Request, type Response } from 'express';
import { arrayContains, db, businessesTable, eq, or } from '@workspace/db';

import {
  isPhotoObjectPath,
  MAX_IMAGE_BYTES,
  photoObjectPath,
  PHOTO_CONTENT_TYPE,
  readPhoto,
  savePhoto,
} from '../lib/photo-storage';
import { readWebpInfo } from '../lib/webp';
import {
  findUser,
  getAccount,
  requireAccount,
  requireRole,
  requireSignedIn,
  resolveUserRole,
} from '../lib/authorization';

const router: IRouter = Router();
const PHOTO_ID = /^[0-9a-f-]{36}$/i;

/**
 * POST /storage/uploads/request-url
 *
 * Returns a one-photo upload URL on this API. The browser then PUTs the WebP
 * bytes to it while signed in; the server checks the file and stores it
 * privately under the student's own folder.
 */
router.post(
  '/storage/uploads/request-url',
  requireSignedIn,
  requireAccount,
  requireRole('student'),
  async (req: Request, res: Response) => {
    const parsed = RequestBusinessPhotoUploadBody.safeParse(req.body);
    if (!parsed.success || parsed.data.contentType !== PHOTO_CONTENT_TYPE || parsed.data.size > MAX_IMAGE_BYTES) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    const { name, size, contentType } = parsed.data;
    const account = getAccount(res);
    const photoId = randomUUID();
    const host = req.get('host');
    const uploadURL = `${req.protocol}://${host}/api/storage/uploads/${photoId}`;

    res.json(
      RequestBusinessPhotoUploadResponse.parse({
        uploadURL,
        objectPath: photoObjectPath(account.user.id, photoId),
        metadata: { name, size, contentType },
      }),
    );
  },
);

/**
 * PUT /storage/uploads/:photoId
 *
 * Receives the photo bytes. Only signed-in students, only WebP, at most
 * 210 KB and 1600 px wide, and a photo id can be written once.
 */
router.put(
  '/storage/uploads/:photoId',
  requireSignedIn,
  requireAccount,
  requireRole('student'),
  express.raw({ type: () => true, limit: MAX_IMAGE_BYTES }),
  async (req: Request, res: Response) => {
    const photoId = String(req.params.photoId || '');
    if (!PHOTO_ID.test(photoId)) {
      res.status(400).json({ error: 'Invalid upload link.' });
      return;
    }
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0 || body.length > MAX_IMAGE_BYTES) {
      res.status(400).json({ error: 'Photos must be WebP images under 210 KB.' });
      return;
    }
    const info = readWebpInfo(body);
    if (!info || info.width > 1600 || info.height > 10000) {
      res.status(400).json({ error: 'Photos must be WebP images up to 1600 pixels wide.' });
      return;
    }

    const account = getAccount(res);
    try {
      await savePhoto(photoObjectPath(account.user.id, photoId), body);
      res.json({ ok: true });
    } catch (error) {
      req.log.error({ err: error }, 'Error saving photo');
      res.status(500).json({ error: "We couldn't save that photo. Please try again." });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serves a business photo. Photos of live businesses are public; photos of
 * businesses still in review are visible only to their owner and the admin.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;
    if (!isPhotoObjectPath(objectPath)) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    const relatedBusinesses = await db
      .select({
        ownerId: businessesTable.ownerId,
        status: businessesTable.status,
      })
      .from(businessesTable)
      .where(
        or(
          arrayContains(businessesTable.photoPaths, [objectPath]),
          eq(businessesTable.logoPath, objectPath),
        ),
      );
    if (!relatedBusinesses.length) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }

    const isPublic = relatedBusinesses.some((business) => business.status === 'live');
    let canReadPrivate = false;
    if (!isPublic) {
      const auth = getAuth(req);
      if (auth.userId) {
        const user = await findUser(auth.userId);
        const claims = auth.sessionClaims as Record<string, unknown> | null;
        const email = typeof claims?.email === 'string' ? claims.email.trim().toLowerCase() : '';
        if (user) {
          const resolvedUser = email
            ? await resolveUserRole(user, { authId: auth.userId, email, firstName: '', name: user.name })
            : user;
          canReadPrivate =
            relatedBusinesses.some((business) => business.ownerId === resolvedUser.id) ||
            resolvedUser.role === 'admin';
        }
      }
    }
    if (!isPublic && !canReadPrivate) {
      res.status(403).json({ error: 'You do not have access to this photo.' });
      return;
    }

    const bytes = await readPhoto(objectPath);
    if (!bytes || bytes.length > MAX_IMAGE_BYTES || !readWebpInfo(bytes)) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }

    res.setHeader('Content-Type', PHOTO_CONTENT_TYPE);
    res.setHeader('Content-Length', String(bytes.length));
    res.setHeader('Cache-Control', `${isPublic ? 'public' : 'private'}, max-age=3600`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(bytes);
  } catch (error) {
    req.log.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
