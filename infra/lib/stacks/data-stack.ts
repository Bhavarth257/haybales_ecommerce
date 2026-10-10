import { RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb';
import type { Construct } from 'constructs';

export class DataStack extends Stack {
  readonly table: Table;
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const S = AttributeType.STRING;
    this.table = new Table(this, 'Table', {
      tableName: 'ParaliSetu',
      partitionKey: { name: 'PK', type: S },
      sortKey: { name: 'SK', type: S },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      timeToLiveAttribute: 'expiresAt', // rate-limit counters expire on their own
      removalPolicy: RemovalPolicy.DESTROY, // hackathon: easy teardown
    });
    for (const n of [1, 2, 3])
      this.table.addGlobalSecondaryIndex({ indexName: `GSI${n}`, partitionKey: { name: `GSI${n}PK`, type: S }, sortKey: { name: `GSI${n}SK`, type: S } });
  }
}
