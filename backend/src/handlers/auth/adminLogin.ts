import { AssociateSoftwareTokenCommand, InitiateAuthCommand, RevokeTokenCommand } from '@aws-sdk/client-cognito-identity-provider';
import { handler as wrap, HttpError, json, parseBody } from '../../lib/response';
import { authError, BAD_LOGIN, CLIENT_ID, cognito, decodeJwt, groupsOf, LOCAL, localCheck, localTokens, mfaCookie, sessionCookies } from '../../lib/session';
import { loginSchema } from '../../validators/auth';

/**
 * Admin console login. With TOTP on, Cognito answers SOFTWARE_TOKEN_MFA and the session waits in __Host-ps_mfa.
 * The pool's MFA is OPTIONAL, so an admin without TOTP gets tokens straight away (MFA_SETUP is only sent
 * when MFA is required); we then enrol TOTP with that access token and hold the tokens in __Host-ps_mfa until
 * /auth/mfa verifies the first code.
 * https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa-totp.html
 */
export const handler = wrap(async (event) => {
  const { email, password } = parseBody(event, loginSchema);
  if (LOCAL) {
    const id = await localCheck(email, password);
    const s = id ? await localTokens(id) : null;
    if (!s?.admin) throw new HttpError(401, BAD_LOGIN);
    return json(200, { ok: true }, sessionCookies(s.at, s.rt)); // local mode skips MFA
  }
  const r = await cognito
    .send(new InitiateAuthCommand({ ClientId: CLIENT_ID, AuthFlow: 'USER_PASSWORD_AUTH', AuthParameters: { USERNAME: email, PASSWORD: password } }))
    .catch((e) => authError(e, 401, BAD_LOGIN));
  const user = r.ChallengeParameters?.USER_ID_FOR_SRP;
  if (r.ChallengeName === 'SOFTWARE_TOKEN_MFA' && r.Session && user)
    return json(200, { mfa: 'TOTP' }, [mfaCookie(`t|${user}|${r.Session}`)]); // group is checked after the code, in /auth/mfa

  const t = r.AuthenticationResult;
  if (!t?.AccessToken || !t.RefreshToken) throw new HttpError(401, BAD_LOGIN);
  if (!groupsOf(decodeJwt(t.AccessToken)).includes('admins')) {
    await cognito.send(new RevokeTokenCommand({ ClientId: CLIENT_ID, Token: t.RefreshToken })).catch(() => {});
    throw new HttpError(401, BAD_LOGIN);
  }
  const { SecretCode: secret } = await cognito.send(new AssociateSoftwareTokenCommand({ AccessToken: t.AccessToken }));
  if (!secret) throw new HttpError(500, 'Could not start two-factor setup');
  const otpauth = `otpauth://totp/Parali%20Setu:${encodeURIComponent(email)}?secret=${secret}&issuer=Parali%20Setu`;
  // ~3 KB (access + refresh token): under the 4 KB cookie limit. Lives 5 minutes.
  return json(200, { mfa: 'SETUP', secret, otpauth }, [mfaCookie(`s|${t.AccessToken}|${t.RefreshToken}`)]);
});
