import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { AccountRecovery, CfnUserPoolGroup, StringAttribute, UserPool, UserPoolClient, UserPoolOperation } from 'aws-cdk-lib/aws-cognito';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CfnWebACL, CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2';
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
      authFlows: { userSrp: true },
      generateSecret: false,
      preventUserExistenceErrors: true,
      // Short-lived tokens: a leaked access/id token dies within the hour, and logging out revokes the refresh token.
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(7),
      enableTokenRevocation: true,
    });

    // Brute-force guard: max 10 sign-in / sign-up / password-reset attempts per IP per 2 minutes
    // (AWS WAF's floor is 10 per window, so this is the closest to 5 a minute). Blocked callers get a
    // Cognito-shaped 429 the frontend shows as "Too many tries". Cognito also locks an account
    // temporarily after repeated wrong passwords, on top of this.
    const visibility = (metricName: string) => ({ cloudWatchMetricsEnabled: true, metricName, sampledRequestsEnabled: true });
    const authOps = ['InitiateAuth', 'SignUp', 'ForgotPassword', 'ResendConfirmationCode'];
    const waf = new CfnWebACL(this, 'AuthWaf', {
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      visibilityConfig: visibility('parali-auth'),
      customResponseBodies: {
        tooMany: {
          contentType: 'APPLICATION_JSON',
          content: JSON.stringify({ __type: 'TooManyRequestsException', message: 'Too many sign-in attempts. Wait a minute and try again.' }),
        },
      },
      rules: [
        {
          name: 'auth-attempts-per-ip',
          priority: 0,
          action: { block: { customResponse: { responseCode: 429, customResponseBodyKey: 'tooMany' } } },
          visibilityConfig: visibility('parali-auth-attempts'),
          statement: {
            rateBasedStatement: {
              limit: 10,
              evaluationWindowSec: 120,
              aggregateKeyType: 'IP',
              scopeDownStatement: {
                orStatement: {
                  // The Cognito API names the operation in X-Amz-Target, e.g. AWSCognitoIdentityProviderService.InitiateAuth.
                  // Raw CloudFormation JSON, hence `Name`.
                  statements: authOps.map((op) => ({
                    byteMatchStatement: {
                      fieldToMatch: { singleHeader: { Name: 'x-amz-target' } },
                      positionalConstraint: 'ENDS_WITH',
                      searchString: `.${op}`,
                      textTransformations: [{ priority: 0, type: 'NONE' }],
                    },
                  })),
                },
              },
            },
          },
        },
      ],
    });
    new CfnWebACLAssociation(this, 'AuthWafLink', { resourceArn: this.userPool.userPoolArn, webAclArn: waf.attrArn });

    new CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: this.client.userPoolClientId });
  }
}
