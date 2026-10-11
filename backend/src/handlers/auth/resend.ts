import { ResendConfirmationCodeCommand } from '@aws-sdk/client-cognito-identity-provider';
import { handler as wrap, json, parseBody } from '../../lib/response';
import { CLIENT_ID, cognito, LOCAL } from '../../lib/session';
import { emailOnlySchema } from '../../validators/auth';

export const handler = wrap(async (event) => {
  const { email } = parseBody(event, emailOnlySchema);
  // Same answer whether or not the account exists or is already confirmed.
  if (!LOCAL)
    await cognito
      .send(new ResendConfirmationCodeCommand({ ClientId: CLIENT_ID, Username: email }))
      .catch((e) => console.warn('resend failed:', e.name));
  return json(200, {});
});
