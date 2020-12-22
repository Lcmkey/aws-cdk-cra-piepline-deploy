import { Stack, App, StackProps, SecretValue, RemovalPolicy, CfnOutput } from "@aws-cdk/core"
import { PipelineProject, BuildSpec } from "@aws-cdk/aws-codebuild"
import { Bucket, BucketEncryption } from "@aws-cdk/aws-s3"
import { Pipeline, Artifact } from "@aws-cdk/aws-codepipeline"
import { GitHubSourceAction, GitHubTrigger, CodeBuildAction, S3DeployAction, ManualApprovalAction } from "@aws-cdk/aws-codepipeline-actions"

export interface PipelineProps extends StackProps {
    readonly prefix: string;
    readonly stage: string;
    readonly repo: string;
    readonly owner: string;
    readonly branch: string;
    readonly oauthToken: string;
}

export class PipelineStack extends Stack {
    constructor(scope: App, id: string, props: PipelineProps) {
        super(scope, id, props)

        /**
         * Get Env Variables
         */
        const { prefix, stage, repo, owner, branch, oauthToken } = props;

        /**
         * Amazon S3 bucket to store CRA website
         */
        const pipelineArtifactBucket = new Bucket(this, `${prefix}-${stage}-CRA-Pipeline-Artifact-Bucket`, {
            bucketName: `${prefix}-${stage}-artifact-bucket`.toLocaleLowerCase(),
            encryption: BucketEncryption.S3_MANAGED,
            removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
        });

        const bucketWebsite = new Bucket(this, `${prefix}-${stage}-CRA-Website-Bucket`, {
            bucketName: `${prefix}-${stage}-website-bucket`.toLocaleLowerCase(),
            websiteIndexDocument: "index.html",
            websiteErrorDocument: "error.html",
            publicReadAccess: true,
            removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
        });

        /**
         * AWS CodeBuild artifacts
         */
        const sourceArtifact = new Artifact();
        const buildArtifact = new Artifact();

        /**
         * Source - Github
         */
        const sourceAction: GitHubSourceAction = new GitHubSourceAction({
            actionName: "Source",
            owner,
            repo,
            oauthToken: SecretValue.secretsManager(oauthToken),
            output: sourceArtifact,
            branch,
            trigger: GitHubTrigger.POLL,
            variablesNamespace: "SourceVariables"
        });

        /**
         * Pipeline Project - Build
         */
        const buildProject: PipelineProject = new PipelineProject(this, `${prefix}-${stage}-Build-Website`, {
            projectName: "website-source-build",
            buildSpec: BuildSpec.fromSourceFilename("./infra/buildspec.yml"),
            // environment: {
            //     buildImage: LinuxBuildImage.STANDARD_3_0
            // },
        });

        /**
         * Code Build Action - Build Source
         */
        const buildAction: CodeBuildAction = new CodeBuildAction({
            actionName: "Build",
            project: buildProject,
            input: sourceArtifact,
            outputs: [buildArtifact],
        })

        /**
         * AWS CodePipeline action to deploy CRA website to S3
         */
        const DeployAction = new S3DeployAction({
            actionName: "Deploy",
            input: buildArtifact,
            bucket: bucketWebsite,
            runOrder: 2
        });

        /**
         * Manual Approval Action - Production
         */
        const manualApprovalAction: ManualApprovalAction = new ManualApprovalAction({
            actionName: "Review",
            additionalInformation: "Agree to deploy",
            runOrder: 1
        });

        /**
         * Create Pipeline
         */
        new Pipeline(this, `${prefix}-${stage}-Website-Pipeline`, {
            pipelineName: "CRA-Website",
            artifactBucket: pipelineArtifactBucket,
            restartExecutionOnUpdate: true,
            stages: [
                {
                    /**
                     * AWS CodePipeline stage to clone sources from GitHub repository
                     */
                    stageName: "Source",
                    actions: [sourceAction],
                }, {
                    /**
                     * AWS CodePipeline stage to build CRA website and CDK resources
                     */
                    stageName: "Build",
                    actions: [buildAction]
                }, {
                    /**
                     * AWS CodePipeline stage to deployt CRA website and CDK resources
                     */
                    stageName: "Deploy",
                    actions: [manualApprovalAction, DeployAction]
                }
            ]
        });

        new CfnOutput(this, "WebsiteURL", {
            value: bucketWebsite.bucketWebsiteUrl,
            description: "Website URL",
        })
    }
}
