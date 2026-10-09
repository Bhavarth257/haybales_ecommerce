import { Duration } from 'aws-cdk-lib';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import type { Construct } from 'constructs';
import * as path from 'path';

const ROOT = path.join(__dirname, '../..');

/** A Lambda for backend/src/handlers/<fn>.ts, bundled with local esbuild. */
export const handlerFn = (scope: Construct, id: string, fn: string, environment: Record<string, string>, timeoutSec = 10) =>
  new NodejsFunction(scope, id, {
    entry: path.join(ROOT, 'backend/src/handlers', `${fn}.ts`),
    projectRoot: ROOT,
    depsLockFilePath: path.join(ROOT, 'package-lock.json'),
    runtime: Runtime.NODEJS_24_X,
    architecture: Architecture.ARM_64,
    memorySize: 256,
    timeout: Duration.seconds(timeoutSec),
    environment,
    bundling: { minify: true, sourceMap: false },
  });
