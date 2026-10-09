// Promote a signed-up account to admin: Cognito group + DynamoDB profile.
// Usage (after the person has signed up and confirmed their email): npm run make-admin -- you@example.com
import { AdminAddUserToGroupCommand, CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db, TABLE } from '../backend/src/lib/db';
import { userKey } from '../backend/src/lib/keys';

const [email] = process.argv.slice(2);
const POOL = process.env.USER_POOL_ID;
if (!email || !POOL) throw new Error('Usage: USER_POOL_ID=... npm run make-admin -- <email>');
const cognito = new CognitoIdentityProviderClient({});

(async () => {
  const { Users = [] } = await cognito.send(new ListUsersCommand({ UserPoolId: POOL, Filter: `email = "${email.replace(/"/g, '')}"`, Limit: 1 }));
  const u = Users[0];
  const sub = u?.Attributes?.find((a) => a.Name === 'sub')?.Value;
  if (!u?.Username || !sub) throw new Error(`No confirmed user with email ${email}`);
  await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: userKey(sub),
      UpdateExpression: 'SET #r = :r, verified = :v, GSI1PK = :g',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeNames: { '#r': 'role' },
      ExpressionAttributeValues: { ':r': 'admin', ':v': true, ':g': 'ROLE#admin' },
    }),
  );
  await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: POOL, Username: u.Username, GroupName: 'admins' }));
  console.log(`${email} is now an admin. Log out and back in to refresh the token.`);
})();
