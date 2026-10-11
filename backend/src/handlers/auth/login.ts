import { InitiateAuthCommand, RevokeTokenCommand } from '@aws-sdk/client-cognito-identity-provider';
import { handler as wrap, HttpError, json, parseBody } from '../../lib/response';
import { authError, BAD_LOGIN, CLIENT_ID, cognito, decodeJwt, groupsOf, LOCAL, localCheck, localTokens, sessionCookies } from '../../lib/session';
import { loginSchema } from '../../validators/auth';

/** Farmers, buyers and transporters. Admins get the same 401 as a wrong password: they use /auth/admin/login. */
export const handler = wrap(async (event) => {
  const { email, password } = parseBody(event, loginSchema);
  if (LOCAL) {
    const id = await localCheck(email, password);
    const s = id ? await localTokens(id) : null;
    if (!s || s.admin) throw new HttpError(401, BAD_LOGIN);
    return json(200, { ok: true }, sessionCookies(s.at, s.rt));
  }
  const r = await cognito
    .send(new InitiateAuthCommand({ ClientId: CLIENT_ID, AuthFlow: 'USER_PASSWORD_AUTH', AuthParameters: { USERNAME: email, PASSWORD: password } }))
    .catch((e) => authError(e, 401, BAD_LOGIN));
  const t = r.AuthenticationResult;
  // Any challenge here (TOTP means an admin) is not for this door.
  if (!t?.AccessToken || !t.RefreshToken) throw new HttpError(401, BAD_LOGIN);
  if (groupsOf(decodeJwt(t.AccessToken)).includes('admins')) {
    await cognito.send(new RevokeTokenCommand({ ClientId: CLIENT_ID, Token: t.RefreshToken })).catch(() => {});
    throw new HttpError(401, BAD_LOGIN);
  }
  return json(200, { ok: true }, sessionCookies(t.AccessToken, t.RefreshToken));
});
