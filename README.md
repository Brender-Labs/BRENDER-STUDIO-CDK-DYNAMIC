# AWS CDK Batch, EFS, and ECR Stack

This AWS CDK (Cloud Development Kit) stack sets up a batch processing environment with the necessary resources, including a Virtual Private Cloud (VPC), Security Groups, Elastic File System (EFS), Amazon Simple Storage Service (S3) bucket, AWS Batch resources, and an API Gateway.


## Stack Components

- **VPC:** The stack creates a VPC with specified configurations, including a gateway endpoint for Amazon S3.

- **Security Groups:** Security groups for the VPC to control inbound and outbound traffic.

- **EFS (Elastic File System):** An EFS file system that is mounted in the Lambda functions for shared storage.

- **Access Point:** An EFS access point configured for specific paths within the file system.

- **S3 Bucket:** An Amazon S3 bucket used for storing data and artifacts.

- **Batch Resources:** AWS Batch resources including compute environment, job definition, and job queue.

- **Lambda Functions:** Two Lambda functions - one for listing EFS contents and another for additional functionality.

- **API Gateway:** An API Gateway to expose the Lambda functions as APIs for external access.

- **CloudWatch Logs:** CloudWatch Logs for logging purposes, associated with the VPC.

## Parameters

- `EcrImageName:` Name of the ECR image to use in the Batch job. Provide this parameter during stack deployment.

## Deployment Examples

- Deploy with a single ECR image:
  ```bash
  cdk deploy --parameters EcrImageName=test-batch-cdk
  ```

- Deploy with multiple ECR images:
  ```bash
  cdk deploy --parameters EcrImageName=job1 --parameters EcrImageName2=job2
  ```

