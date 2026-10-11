import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { AccountRecovery, CfnUserPoolGroup, Mfa, StringAttribute, UserPool, UserPoolClient, UserPoolOperation } from 'aws-cdk-lib/aws-cognito';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import { handlerFn } from '../fn';

export class AuthStack extends Stack {
  readonly userPool: UserPool;
  readonly client: UserPoolClient;
  constructor(scope: Construct, id: string, props: StackProps & { table: Table }) {
    super(scope, id, props);
    this.userPool = new UserPool(this, 'Users', {
      userPoolName: 'parali-setu-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { fullname: { required: true, mutable: true }, phoneNumber: { required: false, mutable: true } },
      customAttributes: { role: new StringAttribute({ mutable: false }) },
      passwordPolicy: { minLength: 8, requireSymbols: false },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      // TOTP only (no SMS: India needs DLT registration). Optional per user; admin routes require it (docs/AUTH.md).
      mfa: Mfa.OPTIONAL,
      mfaSecondFactor: { otp: true, sms: false },
      removalPolicy: RemovalPolicy.DESTROY,
    });
    for (const g of ['farmers', 'buyers', 'transporters', 'admins'])
      new CfnUserPoolGroup(this, `Group-${g}`, { userPoolId: this.userPool.userPoolId, groupName: g });

    const postConfirm = handlerFn(this, 'PostConfirmation', 'users/postConfirmation', { TABLE_NAME: props.table.tableName });
    props.table.grantWriteData(postConfirm);
    // Wildcard pool ARN avoids a pool ↔ trigger circular dependency.
    postConfirm.addToRolePolicy(
      new PolicyStatement({ actions: ['cognito-idp:AdminAddUserToGroup'], resources: [`arn:aws:cognito-idp:${this.region}:${this.account}:userpool/*`] }),
    );
    this.userPool.addTrigger(UserPoolOperation.POST_CONFIRMATION, postConfirm);

    this.client = this.userPool.addClient('Web', {
      // Our Lambdas call InitiateAuth USER_PASSWORD_AUTH over TLS; the browser never talks to Cognito (docs/AUTH.md).
      authFlows: { userPassword: true, userSrp: false },
      generateSecret: false,
      preventUserExistenceErrors: true,
      // Short-lived tokens: a leaked access/id token dies within the hour, and logging out revokes the refresh token.
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(7),
      enableTokenRevocation: true,
    });

    new CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    // Server-only now (Lambda env), kept as an output for scripts.
    new CfnOutput(this, 'UserPoolClientId', { value: this.client.userPoolClientId });
  }
}
