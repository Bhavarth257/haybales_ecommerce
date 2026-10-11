import { ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import { handler as wrap, json, parseBody } from '../../lib/response';
import { authError, CLIENT_ID, cognito, LOCAL } from '../../lib/session';
import { confirmSchema } from '../../validators/auth';

export const handler = wrap(async (event) => {
  const { email, code } = parseBody(event, confirmSchema);
  if (!LOCAL)
    await cognito
      .send(new ConfirmSignUpCommand({ ClientId: CLIENT_ID, Username: email, ConfirmationCode: code }))
      .catch((e) => authError(e, 400, 'Wrong or expired code'));
  return json(200, {});
});
