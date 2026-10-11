import { CfnOutput, Duration, Stack, type StackProps } from 'aws-cdk-lib';
import { CfnStage, CorsHttpMethod, HttpApi, HttpMethod, type HttpRoute } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import type { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import type { Bucket } from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';
import { ROUTES } from '../../../backend/src/routes';
import { handlerFn } from '../fn';

/** Partition-key prefixes each write handler touches (see lib/keys.ts). Offers live under LISTING#. */
const WRITES: Record<string, string[]> = {
  'listings/create': ['LISTING#*'],
  'listings/update': ['LISTING#*'],
  'listings/delete': ['LISTING#*'], // soft delete (UpdateItem)
  'offers/create': ['LISTING#*'],
  'offers/update': ['LISTING#*', 'ORDER#*'],
  'orders/pay': ['ORDER#*', 'STATS'],
  'orders/cancel': ['ORDER#*', 'LISTING#*'],
  'jobs/claim': ['ORDER#*'],
  'jobs/updateStatus': ['ORDER#*', 'STATS'],
  'users/updateMe': ['USER#*'],
  'admin/verifyUser': ['USER#*'],
  'admin/reviewListing': ['LISTING#*'],
};

interface Props extends StackProps {
  table: Table;
  userPool: UserPool;
  client: UserPoolClient;
  bucket: Bucket;
  supportEmail: string;
  appUrl: string;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);
    const api = new HttpApi(this, 'Api', {
      apiName: 'parali-setu',
      // Production is same-origin through the Amplify /api proxy, so CORS only matters for the direct API URL.
      // Credentialed CORS can't use wildcards, so origins and methods are listed (developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Methods).
      corsPreflight: {
        allowOrigins: [props.appUrl, 'capacitor://localhost', 'https://localhost'],
        allowCredentials: true,
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.PUT, CorsHttpMethod.PATCH, CorsHttpMethod.DELETE, CorsHttpMethod.OPTIONS],
        allowHeaders: ['content-type', 'x-requested-with'],
        maxAge: Duration.hours(2), // fewer preflight round-trips on slow mobile networks
      },
    });
    const sesArn = `arn:aws:ses:${this.region}:${this.account}:identity/*`;
    // No API Gateway authorizer: the handler wrapper verifies the ps_at cookie against this pool and client (docs/AUTH.md).
    const env = {
      TABLE_NAME: props.table.tableName,
      PHOTOS_BUCKET: props.bucket.bucketName,
      SUPPORT_EMAIL: props.supportEmail,
      USER_POOL_ID: props.userPool.userPoolId,
      USER_POOL_CLIENT_ID: props.client.userPoolClientId,
    };
    // Bedrock model or cross-region inference profile id (cdk.json context `bedrockModelId`).
    // Confirm it exists before deploy: aws bedrock list-inference-profiles --region ap-south-1
    const bedrockModelId: string = this.node.tryGetContext('bedrockModelId');
    if (!bedrockModelId) throw new Error('Set context bedrockModelId in infra/cdk.json (see README Deploy step 2)');
    const isAi = (fn: string) => fn === 'ai/chat' || fn === 'ai/tts';
    const isAuth = (fn: string) => fn.startsWith('auth/');
    const routes: HttpRoute[] = [];

    for (const r of ROUTES) {
      const fn = isAi(r.fn)
        ? handlerFn(this, r.fn.replace(/\W/g, '-'), r.fn, { ...env, BEDROCK_MODEL_ID: bedrockModelId }, 30)
        : handlerFn(this, r.fn.replace(/\W/g, '-'), r.fn, env);
      // Least privilege: reads for every table route; Put/Update only on the key prefixes the handler writes
      // (no Delete or BatchWrite anywhere). Ownership of the specific item is checked in the handler.
      // auth/* talk to Cognito only (their AUTH# table use is local mode, never deployed).
      if (!isAi(r.fn) && !isAuth(r.fn)) props.table.grantReadData(fn);
      if (WRITES[r.fn])
        fn.addToRolePolicy(
          new PolicyStatement({
            actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem'],
            resources: [props.table.tableArn],
            conditions: { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': WRITES[r.fn] } },
          }),
        );
      // auth/* call only public or token-authorized Cognito APIs (SignUp, InitiateAuth, RespondToAuthChallenge,
      // *SoftwareToken, SetUserMFAPreference, RevokeToken, password flows), which take no IAM:
      // docs.aws.amazon.com/cognito/latest/developerguide/user-pools-API-operations.html#user-pool-apis-auth-unauth
      // The wrapper's TOTP gate on /admin/* calls AdminGetUser, which is IAM-authorized.
      if (r.fn.startsWith('admin/'))
        fn.addToRolePolicy(new PolicyStatement({ actions: ['cognito-idp:AdminGetUser'], resources: [props.userPool.userPoolArn] }));
      // Every route counts its caller's requests (lib/rateLimit.ts): write access to RATE# items only.
      fn.addToRolePolicy(
        new PolicyStatement({
          actions: ['dynamodb:UpdateItem'],
          resources: [props.table.tableArn],
          conditions: { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['RATE#*'] } },
        }),
      );
      if (r.fn === 'uploads/presign') props.bucket.grantPut(fn);
      if (r.fn === 'support/send') fn.addToRolePolicy(new PolicyStatement({ actions: ['ses:SendEmail'], resources: [sesArn] }));
      if (r.fn === 'ai/chat')
        fn.addToRolePolicy(
          new PolicyStatement({
            actions: ['bedrock:InvokeModel'],
            // Inference profiles route to foundation models in other regions, so both ARNs are needed.
            resources: ['arn:aws:bedrock:*::foundation-model/*', `arn:aws:bedrock:*:${this.account}:inference-profile/*`],
          }),
        );
      if (r.fn === 'ai/tts') fn.addToRolePolicy(new PolicyStatement({ actions: ['polly:SynthesizeSpeech'], resources: ['*'] }));
      routes.push(...api.addRoutes({
        path: r.path,
        methods: [HttpMethod[r.method]],
        integration: new HttpLambdaIntegration(`${r.fn}-int`, fn),
      }));
    }
    // Basic abuse protection on every route.
    const stage = api.defaultStage!.node.defaultChild as CfnStage;
    // routeSettings name route keys, so the stage must be created after the routes or the deploy fails.
    api.defaultStage!.node.addDependency(...routes);
    stage.defaultRouteSettings = { throttlingRateLimit: 50, throttlingBurstLimit: 100 };
    // AI routes call paid models: much lower ceiling to cap Bedrock/Polly spend.
    stage.routeSettings = Object.fromEntries(
      // routeSettings is raw JSON (not converted by CDK), so CloudFormation's PascalCase keys.
      ['POST /ai/chat', 'POST /tts'].map((k) => [k, { ThrottlingRateLimit: 3, ThrottlingBurstLimit: 6 }]),
    );
    new CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
  }
}
