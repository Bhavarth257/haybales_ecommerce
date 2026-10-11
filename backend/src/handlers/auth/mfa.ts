import { RespondToAuthChallengeCommand, RevokeTokenCommand, SetUserMFAPreferenceCommand, VerifySoftwareTokenCommand } from '@aws-sdk/client-cognito-identity-provider';
import { handler as wrap, HttpError, json, parseBody } from '../../lib/response';
import { authError, CLIENT_ID, cognito, decodeJwt, groupsOf, LOCAL, MFA, parseCookies, sessionCookies } from '../../lib/session';
import { mfaSchema } from '../../validators/auth';

const BAD_CODE = 'Wrong or expired code';

/** Second step of /auth/admin/login: answer the TOTP challenge, or finish TOTP setup. */
export const handler = wrap(async (event) => {
  const { code } = parseBody(event, mfaSchema);
  const [kind, a, b] = (parseCookies(event.cookies)[MFA] ?? '').split('|');
  if (LOCAL || !a || !b) throw new HttpError(401, 'Sign in again');

  let at: string | undefined, rt: string | undefined;
  if (kind === 't') {
    const r = await cognito
      .send(
        new RespondToAuthChallengeCommand({
          ClientId: CLIENT_ID,
          ChallengeName: 'SOFTWARE_TOKEN_MFA',
          Session: b,
          ChallengeResponses: { USERNAME: a, SOFTWARE_TOKEN_MFA_CODE: code },
        }),
      )
      .catch((e) => authError(e, 401, BAD_CODE));
    at = r.AuthenticationResult?.AccessToken;
    rt = r.AuthenticationResult?.RefreshToken;
  } else if (kind === 's') {
    [at, rt] = [a, b];
    const v = await cognito
      .send(new VerifySoftwareTokenCommand({ AccessToken: at, UserCode: code, FriendlyDeviceName: 'Parali Setu admin' }))
      .catch((e) => authError(e, 401, BAD_CODE));
    if (v.Status !== 'SUCCESS') throw new HttpError(401, BAD_CODE);
    await cognito.send(new SetUserMFAPreferenceCommand({ AccessToken: at, SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true } }));
  }
  if (!at || !rt) throw new HttpError(401, 'Sign in again');
  if (!groupsOf(decodeJwt(at)).includes('admins')) {
    await cognito.send(new RevokeTokenCommand({ ClientId: CLIENT_ID, Token: rt })).catch(() => {});
    throw new HttpError(401, 'Sign in again');
  }
  return json(200, { ok: true }, sessionCookies(at, rt));
});
