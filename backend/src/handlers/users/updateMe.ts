import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { caller } from '../../lib/auth';
import { clean, db, TABLE } from '../../lib/db';
import { userKey } from '../../lib/keys';
import { handler as wrap, json, parseBody } from '../../lib/response';
import { profileSchema } from '../../validators';

export const handler = wrap(async (event) => {
  const { userId } = caller(event);
  const patch = parseBody(event, profileSchema);
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (!entries.length) return json(400, { error: 'Nothing to update' });
  const { Attributes } = await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: userKey(userId),
      UpdateExpression: 'SET ' + entries.map(([k]) => `#${k} = :${k}`).join(', '),
      ExpressionAttributeNames: Object.fromEntries(entries.map(([k]) => [`#${k}`, k])),
      ExpressionAttributeValues: Object.fromEntries(entries.map(([k, v]) => [`:${k}`, v])),
      ConditionExpression: 'attribute_exists(PK)',
      ReturnValues: 'ALL_NEW',
    }),
  );
  return json(200, clean(Attributes));
});
