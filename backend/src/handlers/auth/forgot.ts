import { ForgotPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import { handler as wrap, json, parseBody } from '../../lib/response';
import { CLIENT_ID, cognito, LOCAL } from '../../lib/session';
import { emailOnlySchema } from '../../validators/auth';

export const handler = wrap(async (event) => {
  const { email } = parseBody(event, emailOnlySchema);
  // Same answer whether or not the email exists.
  if (!LOCAL)
    await cognito.send(new ForgotPasswordCommand({ ClientId: CLIENT_ID, Username: email })).catch((e) => console.warn('forgot failed:', e.name));
  return json(200, {});
});
