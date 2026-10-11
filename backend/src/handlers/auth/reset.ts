import { ConfirmForgotPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import { handler as wrap, HttpError, json, parseBody } from '../../lib/response';
import { authError, CLIENT_ID, cognito, LOCAL } from '../../lib/session';
import { resetSchema } from '../../validators/auth';

export const handler = wrap(async (event) => {
  const { email, code, password } = parseBody(event, resetSchema);
  if (LOCAL) throw new HttpError(400, 'Password reset needs email, which local mode does not send');
  await cognito
    .send(new ConfirmForgotPasswordCommand({ ClientId: CLIENT_ID, Username: email, ConfirmationCode: code, Password: password }))
    .catch((e) => authError(e, 400, 'Wrong or expired code'));
  return json(200, {});
});
