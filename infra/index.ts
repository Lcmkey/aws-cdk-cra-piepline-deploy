import * as cdk from '@aws-cdk/core'

import { PipelineStack } from './stacks/pipeline'

const app = new cdk.App()

new PipelineStack(app, 'PipelineStack', {
    env: { region: 'us-east-1' },
});

app.synth()
