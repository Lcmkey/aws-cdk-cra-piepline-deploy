#!/bin/bash

###################################################################################
## Configurations
##

# Environment
APP_ENV=${THIS_DEPLOYMENT_ENV}
echo "APP_ENV = "${APP_ENV}

# Application Name
APP_NAME=${APP_NAME}
echo "APP_NAME = "$APP_NAME

# Which AWS region you plan to place SSM Parameters?
AWS_REGION=$(aws configure get default.region)
echo "AWS_REGION = "$AWS_REGION

# Which AWS Profile you plan to use?
AWS_PROFILE=${AWS_DEFAULT_PROFILE}
echo "AWS_PROFILE = "$AWS_PROFILE

# AWS KMS Key Id
# KMS_KEY_ID=${THIS_AWS_KMS_KEY_ID}

echo
echo

###################################################################################
## Function
##

aws_ssm_put_parameter(){
    TYPE=$1
    PARAM_NAME=$2
    PARAM_VALUE=${!PARAM_NAME}

    PARAM_VERSION_NAME=${PARAM_NAME}ver

    echo "Putting: aws ssm put-parameter: /${APP_NAME}/${APP_ENV}/${PARAM_NAME} in ${TYPE} type..."

    case $TYPE in
        String)
            aws ssm put-parameter \
                --cli-input-json "{
                    \"Name\": \"/${APP_NAME}/${APP_ENV}/${PARAM_NAME}\",
                    \"Value\": \"${PARAM_VALUE}\",
                    \"Type\": \"String\"
                }" \
                --overwrite --region ${AWS_REGION} --profile ${AWS_PROFILE}
            echo 'Put a String param in ssm successfully.'
            ;;
        SecureString)
            PARAM_VERSION=$(aws ssm put-parameter --name /${APP_NAME}/${APP_ENV}/${PARAM_NAME} \
                --value ${PARAM_VALUE} \
                --type SecureString \
                --overwrite --region ${AWS_REGION} --profile ${AWS_PROFILE} \
                --key-id ${KMS_KEY_ID} \
                | jq --raw-output '.Version')
            echo 'Put a SecureString param '$PARAM_NAME' in ssm successfully with version = '$PARAM_VERSION'. Updating a version parameter now...'

            if [ "$PARAM_VERSION" -gt 0 ]; then
                aws ssm put-parameter \
                    --cli-input-json "{
                        \"Name\": \"/${APP_NAME}/${APP_ENV}/${PARAM_VERSION_NAME}\",
                        \"Value\": \"${PARAM_VERSION}\",
                        \"Type\": \"String\"
                    }" \
                    --overwrite --region ${AWS_REGION} --profile ${AWS_PROFILE}
                echo 'Put a version param '$PARAM_VERSION_NAME' for the SecureString param '$PARAM_NAME' in ssm successfully.'
            else
                echo 'Can not parse the version param '$PARAM_VERSION_NAME' for the SecureString param '$PARAM_NAME', please double check your input value or script.'
            fi

            ;;
        *)
            echo "Unknown type: "${TYPE}
            ;;
    esac

    echo
}

###################################################################################
## Main
##

aws_ssm_put_parameter "String"       "PREFIX"
aws_ssm_put_parameter "String"       "STAGE"
aws_ssm_put_parameter "String"       "CDK_ACCOUNT"
aws_ssm_put_parameter "String"       "CDK_REGION"
aws_ssm_put_parameter "String"       "GITHUB_REPO"
aws_ssm_put_parameter "String"       "GITHUB_OWNER"
aws_ssm_put_parameter "String"       "GITHUB_BRANCH"
aws_ssm_put_parameter "String"       "GITHUB_TOEKN_KEY"
# aws_ssm_put_parameter "SecureString" "APP_KEY"

echo "Done: aws ssm put-parameter: /${APP_NAME}/${APP_ENV}/*"