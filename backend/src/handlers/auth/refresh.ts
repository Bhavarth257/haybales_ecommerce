import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { handler as wrap, json } from '../../lib/response';
import { clearAll, CLIENT_ID, cognito, LOCAL, localTokens, parseCookies, RT, sessionCookies, verifyLocal } from '../../lib/session';

/** New __Host-ps_at from __Host-ps_rt, or 401 and clear every cookie. */
export const handler = wrap(async (event) => {
  const rt = parseCookies(event.cookies)[RT];
  let at: string | undefined, newRt: string | undefined;
  if (rt && LOCAL) {
    const c = verifyLocal(rt);
    if (c?.token_use === 'refresh') at = (await localTokens(String(c.sub)))?.at;
  } else if (rt) {
    const r = await cognito
      .send(new InitiateAuthCommand({ ClientId: CLIENT_ID, AuthFlow: 'REFRESH_TOKEN_AUTH', AuthParameters: { REFRESH_TOKEN: rt } }))
      .catch((e) => console.warn('refresh failed:', e.name));
    at = r?.AuthenticationResult?.AccessToken;
    newRt = r?.AuthenticationResult?.RefreshToken; // only set when refresh-token rotation is on
  }
  if (!at) return json(401, { error: 'Not signed in' }, clearAll());
  return json(200, { ok: true }, sessionCookies(at, newRt));
});
