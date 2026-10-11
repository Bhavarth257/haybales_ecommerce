// Promote a signed-up account to admin: Cognito group + DynamoDB profile. Signup can never pick admin.
// Production (after the person has signed up and confirmed their email):
//   USER_POOL_ID=... npm run make-admin -- you@example.com
// Their first login at the admin console then sets up TOTP.
// Local (DynamoDB Local, AUTH_MODE=local accounts):
//   DYNAMO_ENDPOINT=http://localhost:8765 AWS_REGION=ap-south-1 AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local \
//   npx tsx scripts/make-admin.ts --local you@example.com
import { AdminAddUserToGroupCommand, CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db, TABLE } from '../backend/src/lib/db';
import { userKey } from '../backend/src/lib/keys';
import { localUserId } from '../backend/src/lib/session';

const args = process.argv.slice(2);
const local = args[0] === '--local';
const email = (local ? args[1] : args[0])?.trim().toLowerCase();
const POOL = process.env.USER_POOL_ID;

const promote = (id: string) =>
  db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: userKey(id),
      UpdateExpression: 'SET #r = :r, verified = :v, GSI1PK = :g',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeNames: { '#r': 'role' },
      ExpressionAttributeValues: { ':r': 'admin', ':v': true, ':g': 'ROLE#admin' },
    }),
  );

(async () => {
  if (local) {
    if (!email || !process.env.DYNAMO_ENDPOINT) throw new Error('Usage: DYNAMO_ENDPOINT=... npx tsx scripts/make-admin.ts --local <email>');
    const id = await localUserId(email);
    if (!id) throw new Error('No local account with that email');
    await promote(id);
    console.log('Local account is now an admin. Sign in again at the admin console.');
    return;
  }
  if (!email || !POOL) throw new Error('Usage: USER_POOL_ID=... npm run make-admin -- <email>');
  const cognito = new CognitoIdentityProviderClient({});
  const { Users = [] } = await cognito.send(new ListUsersCommand({ UserPoolId: POOL, Filter: `email = "${email.replace(/"/g, '')}"`, Limit: 1 }));
  const u = Users[0];
  const sub = u?.Attributes?.find((a) => a.Name === 'sub')?.Value;
  if (!u?.Username || !sub) throw new Error(`No confirmed user with email ${email}`);
  await promote(sub);
  await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: POOL, Username: u.Username, GroupName: 'admins' }));
  console.log(`${email} is now an admin. They sign in at the admin console and set up TOTP on first login.`);
})().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
