import { CfnOutput, Duration, Stack, type StackProps } from 'aws-cdk-lib';
import { CfnStage, CorsHttpMethod, HttpApi, HttpMethod, type HttpRoute } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import type { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import type { Bucket } from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';
import { ROUTES } from '../../../backend/src/routes';
import { handlerFn } from '../fn';

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
      corsPreflight: {
        allowOrigins: ['*'], // shortcut: tighten to the Amplify domain after deploy
        allowMethods: [CorsHttpMethod.ANY],
        allowHeaders: ['authorization', 'content-type'],
        maxAge: Duration.hours(2), // fewer preflight round-trips on slow mobile networks
      },
    });
    const sesArn = `arn:aws:ses:${this.region}:${this.account}:identity/*`;
    const authorizer = new HttpUserPoolAuthorizer('Cognito', props.userPool, { userPoolClients: [props.client] });
    const env = { TABLE_NAME: props.table.tableName, PHOTOS_BUCKET: props.bucket.bucketName, SUPPORT_EMAIL: props.supportEmail };
    // Bedrock model or cross-region inference profile id (cdk.json context `bedrockModelId`).
    // Confirm it exists before deploy: aws bedrock list-inference-profiles --region ap-south-1
    const bedrockModelId: string = this.node.tryGetContext('bedrockModelId');
    if (!bedrockModelId) throw new Error('Set context bedrockModelId in infra/cdk.json (see README Deploy step 2)');
    const isAi = (fn: string) => fn === 'ai/chat' || fn === 'ai/tts';
    const routes: HttpRoute[] = [];

    for (const r of ROUTES) {
      const fn = isAi(r.fn)
        ? handlerFn(this, r.fn.replace(/\W/g, '-'), r.fn, { ...env, BEDROCK_MODEL_ID: bedrockModelId }, 30)
        : handlerFn(this, r.fn.replace(/\W/g, '-'), r.fn, env);
      // Least privilege: read-only for GETs and for routes that only read the caller's profile.
      if (isAi(r.fn)) {
        // No table access needed.
      } else if (r.method === 'GET' || r.fn === 'uploads/presign' || r.fn === 'support/send') props.table.grantReadData(fn);
      else props.table.grantReadWriteData(fn);
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
        authorizer: r.auth ? authorizer : undefined,
      }));
    }
    // Basic abuse protection on every route.
    const stage = api.defaultStage!.node.defaultChild as CfnStage;
    // routeSettings name route keys, so the stage must be created after the routes or the deploy fails.
    api.defaultStage!.node.addDependency(...routes);
    stage.defaultRouteSettings = { throttlingRateLimit: 50, throttlingBurstLimit: 100 };
    // AI routes call paid models: much lower ceiling to cap Bedrock/Polly spend.
    stage.routeSettings = Object.fromEntries(
      ['POST /ai/chat', 'POST /tts'].map((k) => [k, { throttlingRateLimit: 3, throttlingBurstLimit: 6 }]),
    );
    new CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
  }
}
