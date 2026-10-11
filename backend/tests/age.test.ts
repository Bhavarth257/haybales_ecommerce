import { describe, expect, it } from 'vitest';
import { ageOn, todayIST } from '@parali/shared';
import { signupSchema } from '../src/validators/auth';

describe('age at signup (Asia/Kolkata)', () => {
  it('is 18 on the 18th birthday, 17 the day before', () => {
    expect(ageOn('2008-10-11', '2026-10-11')).toBe(18);
    expect(ageOn('2008-10-12', '2026-10-11')).toBe(17); // turns 18 tomorrow
  });
  it('treats a 29 Feb birth as having its birthday on 1 Mar in non-leap years', () => {
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17);
    expect(ageOn('2008-02-29', '2026-03-01')).toBe(18);
    expect(ageOn('2008-02-29', '2028-02-29')).toBe(20);
  });
  it('uses the Indian date, not UTC', () => {
    // 20:00 UTC on 10 Oct is 01:30 on 11 Oct in India.
    expect(todayIST(new Date('2026-10-10T20:00:00Z'))).toBe('2026-10-11');
  });
  it('rejects impossible or missing dates and a missing 18+ tick', () => {
    const ok = { email: 'a@b.in', password: 'Kheti2026pass', name: 'A', role: 'farmer', dob: '2000-01-31', adult: true, consent: true };
    expect(signupSchema.safeParse(ok).success).toBe(true);
    expect(signupSchema.safeParse({ ...ok, dob: '2001-02-29' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...ok, dob: '31-01-2000' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...ok, adult: false }).success).toBe(false);
    expect(signupSchema.safeParse({ ...ok, consent: undefined }).success).toBe(false);
  });
});
