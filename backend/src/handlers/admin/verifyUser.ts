import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { pathParam, requireRole } from '../../lib/auth';
import { clean, db, TABLE } from '../../lib/db';
import { userKey } from '../../lib/keys';
import { handler as wrap, json, parseBody } from '../../lib/response';
import { verifyUserSchema } from '../../validators';

export const handler = wrap(async (event) => {
  requireRole(event, 'admin');
  const { verified } = parseBody(event, verifyUserSchema);
  const { Attributes } = await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: userKey(pathParam(event, 'id')),
      UpdateExpression: 'SET verified = :v',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeValues: { ':v': verified },
      ReturnValues: 'ALL_NEW',
    }),
  );
  return json(200, clean(Attributes));
});
