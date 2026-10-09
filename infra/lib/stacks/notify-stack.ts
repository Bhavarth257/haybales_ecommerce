import { Stack, type StackProps } from 'aws-cdk-lib';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { FilterCriteria, FilterRule, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { EmailIdentity, Identity } from 'aws-cdk-lib/aws-ses';
import type { Construct } from 'constructs';
import { handlerFn } from '../fn';

export class NotifyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps & { table: Table; supportEmail: string; appUrl: string }) {
    super(scope, id, props);
    // Creating the identity makes SES email a verification link to this address.
    new EmailIdentity(this, 'SupportSender', { identity: Identity.email(props.supportEmail) });
    const fn = handlerFn(this, 'OnChange', 'notify/onChange', { TABLE_NAME: props.table.tableName, SUPPORT_EMAIL: props.supportEmail, APP_URL: props.appUrl });
    props.table.grantReadData(fn);
    fn.addToRolePolicy(new PolicyStatement({ actions: ['ses:SendEmail'], resources: [`arn:aws:ses:${this.region}:${this.account}:identity/*`] }));
    fn.addEventSource(
      new DynamoEventSource(props.table, {
        startingPosition: StartingPosition.LATEST,
        batchSize: 10,
        retryAttempts: 2,
        filters: [FilterCriteria.filter({ dynamodb: { NewImage: { entity: { S: FilterRule.or('OFFER', 'ORDER') } } } })],
      }),
    );
  }
}
