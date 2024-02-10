import * as cdk from 'aws-cdk-lib';
import { EcsEc2ContainerDefinition, EcsJobDefinition, EcsVolume, JobQueue, ManagedEc2EcsComputeEnvironment } from "aws-cdk-lib/aws-batch";
import { ISecurityGroup, IVpc, SubnetType } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import { IFileSystem } from 'aws-cdk-lib/aws-efs';
import { ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";


interface BatchResourcesProps {
    vpc: IVpc,
    sg: ISecurityGroup,
    efs: IFileSystem;
    computeEnvName: string,
    jobDefnName: string,
    jobQueueName: string,
    containerDefnName: string,
    ecrRepositoryName: string,
    s3BucketName: string,
    blenderVersions: string[],
}

export function createBatchResources(scope: Construct, props: BatchResourcesProps) {
    const { vpc, sg, computeEnvName, jobDefnName, jobQueueName, containerDefnName, ecrRepositoryName, efs, s3BucketName , blenderVersions} = props;


    const ecrRepository = Repository.fromRepositoryName(scope, 'ECRRepository', ecrRepositoryName);
    ecrRepository.grantPull(new ServicePrincipal('batch.amazonaws.com'))

    

    const computeEnv = new ManagedEc2EcsComputeEnvironment(scope, computeEnvName, {
        useOptimalInstanceClasses: true,
        instanceRole: new Role(scope, 'ComputeEnvironmentRole', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role'),
            ],
            inlinePolicies: {
                s3: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            actions: [
                                's3:GetObject',
                                's3:PutObject',
                                's3:DeleteObject',
                                's3:ListBucket'
                            ],
                            resources: [
                                `arn:aws:s3:::${s3BucketName}/*`,
                                `arn:aws:s3:::${s3BucketName}`,
                            ],

                        }),
                    ],
                }),
            },
        }),
        vpc,
        vpcSubnets: {
            subnetType: SubnetType.PUBLIC,
        },
        securityGroups: [sg],
        minvCpus: 0,
        maxvCpus: 256,
        enabled: true,
    })



    const jobQueue = new JobQueue(scope, jobQueueName, {
        computeEnvironments: [{
            computeEnvironment: computeEnv,
            order: 1,
        }],
        priority: 10,
    });

    const firstBlenderVersion = cdk.Fn.select(1, blenderVersions);

    console.log('firstBlenderVersion', firstBlenderVersion)

    const jobDefn = new EcsJobDefinition(scope, jobDefnName, {
        timeout: cdk.Duration.minutes(1),
        retryAttempts: 1,
        container: new EcsEc2ContainerDefinition(scope, containerDefnName, {
            image: ContainerImage.fromEcrRepository(ecrRepository, firstBlenderVersion),
            memory: cdk.Size.mebibytes(2048),
            cpu: 1,
            volumes: [EcsVolume.efs({
                name: 'efs-volume',
                fileSystem: efs,
                containerPath: '/mnt/efs',
                rootDirectory: '/',
                // useJobRole: true,
                enableTransitEncryption: true,
            })],
        }),
    });

}