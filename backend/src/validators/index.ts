import { z } from 'zod';
import { CROPS, FORMS } from '@parali/shared';

/** Path ids: Cognito subs and UUIDs (plus seed ids like demo-listing-01). */
export const idSchema = z.string().regex(/^[A-Za-z0-9-]{1,64}$/);

const text = (max: number) => z.string().trim().min(1).max(max);

/** Tonnes are kept to 2 decimals (10 kg) so subtraction never leaves 3.1999999 behind. */
export const roundTonnes = (t: number) => Math.round(t * 100) / 100;
const tonnes = z.number().min(0.01).max(10000).transform(roundTonnes);

const placeSchema = z.object({
  lat: z.number().min(6).max(38), // India bounding box
  lng: z.number().min(68).max(98),
  village: text(80).optional(),
  district: text(80),
  state: text(60),
});

export const listingSchema = z.object({
  crop: z.enum(CROPS),
  form: z.enum(FORMS),
  tonnes,
  pricePerTonne: z.number().int().min(100).max(20000),
  harvestDate: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),
  moisturePct: z.number().min(0).max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
  place: placeSchema,
  photos: z.array(z.string().regex(/^listings\/[\w-]+\/[\w.-]+$/)).max(4).default([]),
});
export const listingUpdateSchema = listingSchema.partial().extend({ status: z.enum(['ACTIVE', 'CLOSED']).optional() });

export const offerSchema = z.object({
  tonnes,
  pricePerTonne: z.number().int().min(100).max(20000),
  message: z.string().trim().max(500).optional(),
});

export const offerActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept') }),
  z.object({ action: z.literal('reject') }),
  z.object({ action: z.literal('withdraw') }),
  z.object({ action: z.literal('counter'), counterPrice: z.number().int().min(100).max(20000) }),
]);

export const jobStatusSchema = z.object({ action: z.enum(['pickup', 'deliver']) });

export const profileSchema = z.object({
  name: text(80).optional(),
  phone: z.string().regex(/^\+?[0-9]{10,13}$/).optional(),
  org: text(120).optional(),
  place: placeSchema.optional(),
  locale: z.enum(['en', 'hi', 'pa', 'bgc', 'ta', 'te', 'ml']).optional(),
});

export const presignSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export const supportSchema = z.object({ subject: text(120), message: text(3000) });

export const reviewListingSchema = z.object({ decision: z.enum(['approve', 'reject']) });
export const verifyUserSchema = z.object({ verified: z.boolean() });

// AI assistant. Bedrock Converse needs user-first, alternating turns ending on the user.
export const chatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), text: text(2000) }))
    .min(1)
    .max(12)
    .refine((m) => m.every((x, i) => x.role === (i % 2 === 0 ? 'user' : 'assistant')) && m[m.length - 1].role === 'user', {
      message: 'Turns must alternate, starting and ending with the user',
    }),
  locale: z.enum(['en', 'hi', 'pa', 'bgc', 'ta', 'te', 'ml']).optional(),
});
export const ttsSchema = z.object({ text: text(1500), lang: z.enum(['hi', 'en']) });
