import { SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { User } from '@parali/shared';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { db, now, TABLE } from '../../lib/db';
import { userKey } from '../../lib/keys';
import { handler as wrap, HttpError, json, parseBody } from '../../lib/response';
import { authError, CLIENT_ID, cognito, LOCAL, localCreate } from '../../lib/session';
import { signupSchema } from '../../validators/auth';

const PASSWORD_RULE = 'Password needs 8+ characters with upper and lower case letters and a number';

export const handler = wrap(async (event) => {
  const b = parseBody(event, signupSchema);
  if (LOCAL) {
    // Auto-confirmed; the profile is what postConfirmation would write. A taken email answers the same.
    const userId = randomUUID();
    if (await localCreate(b.email, b.password, userId)) {
      const user: User = { userId, role: b.role, name: b.name, email: b.email, phone: b.phone, locale: 'en', verified: false, createdAt: now() };
      await db.send(new PutCommand({ TableName: TABLE, Item: { ...userKey(userId), entity: 'USER', GSI1PK: `ROLE#${b.role}`, GSI1SK: user.createdAt, ...user } }));
    }
    return json(200, { next: 'login' });
  }
  await cognito
    .send(
      new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: b.email,
        Password: b.password,
        UserAttributes: [
          { Name: 'email', Value: b.email },
          { Name: 'name', Value: b.name },
          { Name: 'custom:role', Value: b.role },
          ...(b.phone ? [{ Name: 'phone_number', Value: b.phone }] : []),
        ],
      }),
    )
    .catch((e) => {
      // Same answer for a taken email, so signup can't be used to probe accounts.
      if (e.name === 'UsernameExistsException') return;
      if (e.name === 'InvalidPasswordException') throw new HttpError(400, PASSWORD_RULE);
      authError(e, 400, 'Could not sign up. Check your details and try again.');
    });
  return json(200, { next: 'confirm' });
});
