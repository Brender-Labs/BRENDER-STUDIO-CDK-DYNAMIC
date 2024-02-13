import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { createVpc } from './vpc/vpc';
import { createSecurityGroup } from './vpc/sg';
import { createBatchResources } from './batch/batchResources';
import { createVpcCloudwatchLogs } from './cloudwatch/vpc-logs';
import { Port } from 'aws-cdk-lib/aws-ec2';
import { createFileSystem } from './efs/fileSystem';
import { createAccessPoint } from './efs/accessPoint';
import { createS3Bucket } from './s3/s3Bucket';
import { createListContentsFn } from './functions/listEfsContentsFn/construct';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { BrenderStudioStackProps } from './stack-config/stackProps';
import { v4 as uuidv4 } from 'uuid';

export class BrenderStudioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: BrenderStudioStackProps) {
    super(scope, id, props);

    const lambdaLocalMountPath = '/mnt/files';

    // PARAMETERS
    const ecrImageNameParameter = new cdk.CfnParameter(this, 'ecrImageName', {
      type: 'String',
      description: 'Name of the ECR image to use in the Batch job',
    });

    const blenderVersions = props?.blenderVersionsList;
    console.log('blenderVersions', blenderVersions)

    const privateStack = props?.isPrivate;

    const isPrivate = Boolean(privateStack);
    console.log('isPrivate', isPrivate)

    const brenderBucketName = 'brender-bucket-s3-' + uuidv4();

    // cdk deploy --context stackName=BRENDER-STACK-TEST --parameters ecrImageName=brender-repo-ecr --context blenderVersions="GPU-4.0.0,CPU-4.0.0,CPU-3.6.0" --context brenderBucketName=brender-david-studio-test
    // cdk deploy --context stackName=BRENDER-STACK-TEST --parameters ecrImageName=brender-repo-ecr --context blenderVersions="GPU-4.0.0,CPU-4.0.0,CPU-3.6.0"  --context isPrivate="false"



    const vpc = createVpc(this, {
      name: 'Vpc-' + uuidv4(),
      gatewayEndpointName: 'VpcEndpointGatewayS3-' + uuidv4(),
      isPrivate,
    })

    const vpcSecurityGroup = createSecurityGroup(this, {
      name: 'SecurityGroup-' + uuidv4(),
      vpc
    })

    // vpc.addInterfaceEndpoint('vpc-interface-endpoint-efs', {
    //   service: InterfaceVpcEndpointAwsService.ELASTIC_FILESYSTEM,
    //   securityGroups: [vpcSecurityGroup],
    //   privateDnsEnabled: true,
    // });

    const efs = createFileSystem(this, {
      name: 'Efs-' + uuidv4(),
      vpc: vpc,
      sg: vpcSecurityGroup,
    });

    const accessPoint = createAccessPoint(this, {
      name: 'S3AccesPoint-' + uuidv4(),
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

    efs.connections.allowFrom(vpcSecurityGroup, Port.tcp(2049));


    const listEfsContentsFn = createListContentsFn(this, {
      name: 'ListEfsContentFunction',
      lambdaLocalMountPath: lambdaLocalMountPath,
      vpc: vpc,
      accessPoint: accessPoint,
      efs: efs,
    });

    const api = new LambdaRestApi(this, 'ApiBatchEfsListContent', {
      handler: listEfsContentsFn,
    });


    const logGroup = createVpcCloudwatchLogs(this, {
      vpc,
      logGroupName: 'FlowLogsGroup-' + uuidv4(),
      logRoleName: 'CloudwatchLogsRole-' + uuidv4()
    })

    if (!blenderVersions) {
      throw new Error('blenderVersions is required');
    }

    const batch = createBatchResources(this, {
      vpc,
      sg: vpcSecurityGroup,
      efs: efs,
      ecrRepositoryName: ecrImageNameParameter.valueAsString,
      s3BucketName: s3Bucket.bucketName,
      blenderVersionsList: blenderVersions,
      isPrivate,
    })
  }
}
