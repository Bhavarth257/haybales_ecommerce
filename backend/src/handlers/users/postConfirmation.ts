import { AdminAddUserToGroupCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { LEGAL_VERSION, ROLE_GROUP, type Role, type User } from '@parali/shared';
import type { PostConfirmationTriggerEvent } from 'aws-lambda';
import { db, now, TABLE } from '../../lib/db';
import { userKey } from '../../lib/keys';

const cognito = new CognitoIdentityProviderClient({});
// Admin is never self-assigned; admins are added by hand in Cognito.
const SELF_SERVE: Role[] = ['farmer', 'buyer', 'transporter'];

export const handler = async (event: PostConfirmationTriggerEvent) => {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') return event;
  const a = event.request.userAttributes;
  const role = a['custom:role'] as Role;
  if (!SELF_SERVE.includes(role)) throw new Error('Invalid role');

  await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: event.userPoolId, Username: event.userName, GroupName: ROLE_GROUP[role] }));
  const user: User = {
    userId: a.sub,
    role,
    name: a.name ?? a.email,
    email: a.email,
    phone: a.phone_number,
    locale: a.locale ?? 'en',
    verified: false,
    createdAt: now(),
    dob: a.birthdate,
    // Signup refuses requests without the Terms + Privacy tick, so a confirmed account agreed to these versions.
    // TODO: `at` is the confirm time (minutes after the tick); store the tick time if a lawyer asks for it.
    consent: { termsVersion: LEGAL_VERSION, privacyVersion: LEGAL_VERSION, at: now() },
  };
  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: { ...userKey(a.sub), entity: 'USER', GSI1PK: `ROLE#${role}`, GSI1SK: user.createdAt, ...user },
      ConditionExpression: 'attribute_not_exists(PK)',
    }),
  ).catch((e) => {
    if (e.name !== 'ConditionalCheckFailedException') throw e;
  });
  return event;
};
