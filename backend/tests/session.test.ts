import { describe, expect, it } from 'vitest';
import { clearCookie, csrfOk, parseCookies, setCookie, signLocal, verifyLocal } from '../src/lib/session';
import { clientIp, LIMITS, tierOf } from '../src/lib/rateLimit';

describe('cookies', () => {
  it('parses API Gateway v2 cookie entries', () => {
    expect(parseCookies(['__Host-ps_at=abc.def', '__Host-ps_rt=x=y'])).toEqual({ '__Host-ps_at': 'abc.def', '__Host-ps_rt': 'x=y' });
  });
  it('parses a raw Cookie header folded into one entry', () => {
    expect(parseCookies(['a=1; b=2'])).toEqual({ a: '1', b: '2' });
  });
  it('returns nothing for no cookies', () => {
    expect(parseCookies(undefined)).toEqual({});
  });
  it('keeps the first value when a name repeats', () => {
    expect(parseCookies(['a=1', 'a=2']).a).toBe('1');
  });
  it('serialises a session cookie with all the hardening flags', () => {
    expect(setCookie('__Host-ps_at', 'tok', 3600)).toBe('__Host-ps_at=tok; Max-Age=3600; Path=/; HttpOnly; Secure; SameSite=Strict');
  });
  it('clears a cookie with Max-Age=0', () => {
    expect(clearCookie('__Host-ps_rt')).toBe('__Host-ps_rt=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict');
  });
});

describe('local tokens', () => {
  it('round-trips claims', () => {
    const t = signLocal({ sub: 'u1', token_use: 'access' }, 60);
    expect(verifyLocal(t)).toMatchObject({ sub: 'u1', token_use: 'access' });
  });
  it('rejects a tampered payload', () => {
    const [, sig] = signLocal({ sub: 'u1' }, 60).split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'admin', exp: 9e9 })).toString('base64url');
    expect(verifyLocal(`${forged}.${sig}`)).toBeNull();
  });
  it('rejects an expired token', () => {
    expect(verifyLocal(signLocal({ sub: 'u1' }, -1))).toBeNull();
  });
  it('rejects garbage', () => {
    expect(verifyLocal('nope')).toBeNull();
    expect(verifyLocal('')).toBeNull();
  });
});

describe('CSRF header check', () => {
  it('lets GET through without the header', () => {
    expect(csrfOk('GET', {})).toBe(true);
  });
  it('blocks a write without x-requested-with: parali', () => {
    expect(csrfOk('POST', {})).toBe(false);
    expect(csrfOk('DELETE', { 'x-requested-with': 'XMLHttpRequest' })).toBe(false);
  });
  it('allows a write with the header', () => {
    expect(csrfOk('PATCH', { 'x-requested-with': 'parali' })).toBe(true);
  });
});

describe('auth rate tier', () => {
  it('puts every /auth route in the strict tier', () => {
    expect(tierOf('POST', '/auth/login')).toBe('auth');
    expect(tierOf('POST', '/auth/admin/login')).toBe('auth');
    expect(LIMITS.auth).toEqual([5, 60]);
  });
  it('takes the last x-forwarded-for entry (the one CloudFront appends), else the source IP', () => {
    // A client can send its own XFF ("6.6.6.6"); CloudFront appends the real viewer IP after it.
    expect(clientIp({ headers: { 'x-forwarded-for': '6.6.6.6, 1.2.3.4' }, requestContext: { http: { sourceIp: '9.9.9.9' } } })).toBe('1.2.3.4');
    expect(clientIp({ requestContext: { http: { sourceIp: '9.9.9.9' } } })).toBe('9.9.9.9');
  });
});
