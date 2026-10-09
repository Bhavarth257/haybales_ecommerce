import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { randomUUID } from 'crypto';
import { requireRole } from '../../lib/auth';
import { handler as wrap, json, parseBody } from '../../lib/response';
import { requireVerified } from '../../lib/users';
import { presignSchema } from '../../validators';

const s3 = new S3Client({});
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
const MAX_BYTES = 5_000_000;

/** Presigned POST (not PUT) so S3 itself enforces type and a 5 MB size cap. */
export const handler = wrap(async (event) => {
  const { userId } = requireRole(event, 'farmer');
  await requireVerified(userId);
  const { contentType } = parseBody(event, presignSchema);
  const key = `listings/${userId}/${randomUUID()}.${EXT[contentType]}`;
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: process.env.PHOTOS_BUCKET!,
    Key: key,
    Conditions: [['content-length-range', 1, MAX_BYTES], ['eq', '$Content-Type', contentType]],
    Fields: { 'Content-Type': contentType },
    Expires: 300,
  });
  return json(200, { url, fields, key });
});
