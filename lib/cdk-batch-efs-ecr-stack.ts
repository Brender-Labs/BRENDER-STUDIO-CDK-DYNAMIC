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

    const blenderVersionsParameter = new cdk.CfnParameter(this, 'BlenderVersions', {
      type: 'CommaDelimitedList',
      description: 'Blender versions to use in the Batch job',

    });

    // Convert the parameter string(with , separator) to a list of strings (array)
    
    // const blenderVersions = blenderVersionsParameter.valueAsList;

    // console.log('blenderVersions', blenderVersions);


    //CMD: cdk deploy --context stackName=BRENDER-STACK-TEST --parameters EcrImageName=blender-repo-ecr --parameters BlenderVersions=GPU-4.0.0,CPU-4.0.0,CPU-3.6.0
    // cdk deploy --context stackName=BRENDER-STACK-TEST --parameters EcrImageName=blender-repo-ecr --parameters BlenderVersions="GPU-4.0.0\,CPU-4.0.0\,CPU-3.6.0"
    // cdk deploy --context stackName=BRENDER-STACK-TEST --parameters EcrImageName=blender-repo-ecr --parameters BlenderVersions=GPU-4.0.0--CPU-4.0.0--CPU-3.6.0



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
      jobQueueName: 'batch-job-queue',
      containerDefnName: 'batch-container-defn',
      ecrRepositoryName: ecrImageNameParameter.valueAsString,
      s3BucketName: s3Bucket.bucketName,
      blenderVersions: blenderVersionsParameter.valueAsList
    })


  }
}
