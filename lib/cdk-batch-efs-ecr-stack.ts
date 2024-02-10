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
import { createCopyToEfsFn } from './functions/copyToEfsFn/construct';
import { createListContentsFn } from './functions/listEfsContentsFn/construct';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';

export class CdkBatchEfsEcrStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaLocalMountPath = '/mnt/files';

    // PARAMETERS
    const ecrImageNameParameter = new cdk.CfnParameter(this, 'EcrImageName', {
      type: 'String',
      description: 'Name of the ECR image to use in the Batch job',
    });

    // const ecrImageNameParameter2 = new cdk.CfnParameter(this, 'EcrImageName2', {
    //   type: 'String',
    //   description: 'Name of the ECR image to use in the Batch job 2',
    // });

    //CMD Jer//##: cdk deploy --parameters EcrImageName=test-batch-cdk
    // CMD JER IMAGE 2: cdk deploy --parameters EcrImageName=job1 --parameters EcrImageName2=job2
    // CMD JER IMAGE 2: cdk deploy --parameters EcrImageName2=job2
    // CMD JER IMAGE 3: cdk deploy --parameters EcrImageName=batch-brender-jobs
    //CMD David//##: cdk deploy --parameters EcrImageName=test-batch-ecr-blender


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

    const s3Bucket = createS3Bucket(this, {
      name: 'brender-cdk-ecr-batch-s3-bucket',
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

    const batch = createBatchResources(this, {
      vpc,
      sg: vpcSg,
      efs: efs,
      computeEnvName: 'batch-compute-env',
      jobDefnName: 'batch-job-defn',
      // jobDefn2Name: 'batch-job-defn2',
      jobQueueName: 'batch-job-queue',
      containerDefnName: 'batch-container-defn',
      // containerDefn2Name: 'batch-container-defn2',
      ecrRepositoryName: ecrImageNameParameter.valueAsString,
      // ecrRepository2Name: ecrImageNameParameter2.valueAsString,
      s3BucketName: s3Bucket.bucketName,
    })


  }
}
