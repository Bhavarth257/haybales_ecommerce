import { CfnOutput, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { Distribution, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods } from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

export class StorageStack extends Stack {
  readonly bucket: Bucket;
  constructor(scope: Construct, id: string, props: StackProps & { appUrl: string }) {
    super(scope, id, props);
    this.bucket = new Bucket(this, 'Photos', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      // shortcut: '*' allows uploads from localhost and the Amplify URL; pin to the real domain after deploy.
      cors: [{ allowedMethods: [HttpMethods.POST], allowedOrigins: ['*'], allowedHeaders: ['*'] }],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const cdn = new Distribution(this, 'PhotosCdn', {
      defaultBehavior: { origin: S3BucketOrigin.withOriginAccessControl(this.bucket), viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS },
    });
    new CfnOutput(this, 'PhotosCdnUrl', { value: `https://${cdn.distributionDomainName}` });
  }
}
