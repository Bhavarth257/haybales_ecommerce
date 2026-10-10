import { App } from 'aws-cdk-lib';
import { ApiStack } from '../lib/stacks/api-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { DataStack } from '../lib/stacks/data-stack';
import { NotifyStack } from '../lib/stacks/notify-stack';
import { StorageStack } from '../lib/stacks/storage-stack';

const app = new App();
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'ap-south-1' };
const supportEmail: string = app.node.tryGetContext('supportEmail');
const appUrl: string = app.node.tryGetContext('appUrl');
const photosCdn = app.node.tryGetContext('photosCdn') !== false;

const data = new DataStack(app, 'ParaliData', { env });
const auth = new AuthStack(app, 'ParaliAuth', { env, table: data.table });
const storage = new StorageStack(app, 'ParaliStorage', { env, appUrl, photosCdn });
new ApiStack(app, 'ParaliApi', { env, table: data.table, userPool: auth.userPool, client: auth.client, bucket: storage.bucket, supportEmail, appUrl });
new NotifyStack(app, 'ParaliNotify', { env, table: data.table, supportEmail, appUrl });
