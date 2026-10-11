import { z } from 'zod';

const email = z.string().trim().toLowerCase().email().max(254);
// Mirrors the Cognito pool policy (min 8, upper, lower, digit) so local mode behaves the same.
const password = z
  .string()
  .min(8)
  .max(256)
  .refine((p) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p), 'Use upper and lower case letters and a number');
// A real calendar date (rejects 2001-02-29), not in the future.
const dob = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => d >= '1900-01-01' && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().startsWith(d), 'Enter a real date of birth');
const code = z.string().trim().regex(/^\d{6}$/);

export const signupSchema = z.object({
  email,
  password,
  name: z.string().trim().min(1).max(80),
  role: z.enum(['farmer', 'buyer', 'transporter']), // never admin
  phone: z.string().regex(/^\+[0-9]{10,15}$/).optional(),
  dob,
  adult: z.literal(true), // "I am 18 or older"; the server still checks dob
  consent: z.literal(true), // "I agree to the Terms and the Privacy Policy"
});
export const deleteSchema = z.object({ confirm: z.literal('DELETE') });
export const emailOnlySchema = z.object({ email });
export const confirmSchema = z.object({ email, code });
export const loginSchema = z.object({ email, password: z.string().min(1).max(256) });
export const mfaSchema = z.object({ code });
export const resetSchema = z.object({ email, code, password });
