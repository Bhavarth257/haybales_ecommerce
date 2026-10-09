#!/usr/bin/env bash
# DynamoDB Local (in-memory) on :8765. Needs Java 17+; JAVA env var overrides the binary.
# Download once: curl -sL https://d1ni2b6xgvw0s0.cloudfront.net/v2.x/dynamodb_local_latest.tar.gz | tar xz -C .dynamodb
cd "$(dirname "$0")/../.dynamodb" && exec "${JAVA:-$HOME/.local/jre17/bin/java}" -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -inMemory -sharedDb -port 8765
