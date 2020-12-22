#!/usr/bin/env node
require("dotenv").config();

import * as cdk from "@aws-cdk/core";

import { PipelineStack } from "./stacks/";

let {
    PREFIX: prefix = "[STACK_PREFIX_NAME]",
    STAGE: stage = "[DEPLOYMENT_STAGE]",
    RUN_IN_AWS_PIEPLINE = JSON.parse("true"),
    CDK_ACCOUNT: accountId = "[AWS_ACCOUNT ID]",
    CDK_REGION: region = "ap-east-1",
    REPO: repo = "GIT REPO", // *Case Sensitive
    OWNER: owner = "GIT OWNER",
    BRANCH: branch = "GIT BRANCH", // "release","master";
    GITHUB_TOEKN_KEY: gitToken = "[GITHUB_OAUTH_TOKEN]"
} = process.env;

/**
 * AWS defulat ENV config Definition
 */
const env = {
    account: accountId,
    region: region,
};

const app = new cdk.App()

new PipelineStack(app, `${prefix}-${stage}-PipelineStack`, {
    env,
    prefix,
    stage,
    repo,
    owner,
    branch,
    oauthToken: gitToken
});

app.synth();
