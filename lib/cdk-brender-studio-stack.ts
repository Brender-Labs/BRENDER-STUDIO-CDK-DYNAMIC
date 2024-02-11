import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { createVpc } from './vpc/vpc';
import { createSecurityGroup } from './vpc/sg';
import { createBatchResources } from './batch/batchResources';
import { createVpcCloudwatchLogs } from './cloudwatch/vpc-logs';
import { InterfaceVpcEndpointAwsService, Port } from 'aws-cdk-lib/aws-ec2';
import { createFileSystem } from './efs/fileSystem';
import { createAccessPoint } from './efs/accessPoint';
import { createS3Bucket } from './s3/s3Bucket';
import { createListContentsFn } from './functions/listEfsContentsFn/construct';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { BrenderStudioStackProps } from './stack-config/stackProps';


export class BrenderStudioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: BrenderStudioStackProps) {
    super(scope, id, props);

    const lambdaLocalMountPath = '/mnt/files';

    // PARAMETERS
    const ecrImageNameParameter = new cdk.CfnParameter(this, 'EcrImageName', {
      type: 'String',
      description: 'Name of the ECR image to use in the Batch job',
    });

    const blenderVersions = props?.blenderVersionsList;
    console.log('blenderVersions', blenderVersions)

    const brenderBucketName = props?.brenderBucketName;

    // cdk deploy --context stackName=BRENDER-STACK-TEST --parameters EcrImageName=brender-repo-ecr --context BlenderVersions="GPU-4.0.0,CPU-4.0.0,CPU-3.6.0" --context brenderBucketName=brender-david-studio-test


    const vpc = createVpc(this, {
      name: 'batch-vpc',
      gatewayEndpointName: 'vpce-s3'
    })

    const vpcSg = createSecurityGroup(this, {
      name: 'batch-vpc-sg',
      vpc
    })

    vpc.addInterfaceEndpoint('vpc-interface-endpoint-efs', {
      service: InterfaceVpcEndpointAwsService.ELASTIC_FILESYSTEM,
      securityGroups: [vpcSg],
      privateDnsEnabled: true,
    });

    const efs = createFileSystem(this, {
      name: 'cdk-efs-batch-s3-efs',
      vpc: vpc,
      sg: vpcSg,
    });

    const accessPoint = createAccessPoint(this, {
      name: 'cdk-efs-batch-s3-access-point',
      efs: efs,
      // path: '/efs/lambda',
      path: '/projects',
    });

    if (!brenderBucketName) {
      throw new Error('brenderBucketName is required');
    }


    const s3Bucket = createS3Bucket(this, {
      name: brenderBucketName,
    });

    efs.connections.allowFrom(vpcSg, Port.tcp(2049));


    const listEfsContentsFn = createListContentsFn(this, {
      name: 'list-efs-contents-fn',
      lambdaLocalMountPath: lambdaLocalMountPath,
      vpc: vpc,
      accessPoint: accessPoint,
      efs: efs,
    });

    const api = new LambdaRestApi(this, 'cdk-efs-batch-s3-api', {
      handler: listEfsContentsFn,
    });


    const logGroup = createVpcCloudwatchLogs(this, {
      vpc,
      logGroupName: 'flow-logs-group',
      logRoleName: 'CloudWatchLogsRole'
    })

    if (!blenderVersions) {
      throw new Error('blenderVersions is required');
    }

    const batch = createBatchResources(this, {
      vpc,
      sg: vpcSg,
      efs: efs,
      computeEnvName: 'batch-compute-env',
      jobDefnName: 'batch-job-defn',
      jobQueueName: 'batch-job-queue',
      containerDefnName: 'batch-container-defn',
      ecrRepositoryName: ecrImageNameParameter.valueAsString,
      s3BucketName: s3Bucket.bucketName,
      blenderVersionsList: blenderVersions,
    })
  }
}
