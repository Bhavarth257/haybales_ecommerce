import { RevokeTokenCommand } from '@aws-sdk/client-cognito-identity-provider';
import { handler as wrap, json } from '../../lib/response';
import { clearAll, CLIENT_ID, cognito, LOCAL, parseCookies, RT } from '../../lib/session';

/** Revoke the refresh token (and the access tokens it issued) and clear every cookie. */
export const handler = wrap(async (event) => {
  const rt = parseCookies(event.cookies)[RT];
  // shortcut: local mode can't revoke its HMAC tokens; clearing the cookies is enough for dev.
  if (rt && !LOCAL) await cognito.send(new RevokeTokenCommand({ ClientId: CLIENT_ID, Token: rt })).catch((e) => console.warn('revoke failed:', e.name));
  return json(200, { ok: true }, clearAll());
});
