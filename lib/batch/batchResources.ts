import * as cdk from 'aws-cdk-lib';
import { AllocationStrategy, EcsEc2ContainerDefinition, EcsJobDefinition, EcsVolume, JobQueue, ManagedEc2EcsComputeEnvironment } from "aws-cdk-lib/aws-batch";
import { ISecurityGroup, IVpc, InstanceType, SubnetType } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import { IFileSystem } from 'aws-cdk-lib/aws-efs';
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { createS3Policy } from '../iam-roles/s3/createS3Policy';


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
    blenderVersionsList: string,
    isPrivate: boolean,
}

export function createBatchResources(scope: Construct, props: BatchResourcesProps) {
    const { vpc, sg, computeEnvName, jobDefnName, containerDefnName, ecrRepositoryName, efs, s3BucketName, blenderVersionsList, isPrivate } = props;


    const ecrRepository = Repository.fromRepositoryName(scope, 'ECRRepository', ecrRepositoryName);
    ecrRepository.grantPull(new ServicePrincipal('batch.amazonaws.com'))


    const s3Policy = createS3Policy(scope, { s3BucketName })


    // =================COMPUTE ENVIRONMENTS CPU=================

    const computeEnvOnDemandCPU = new ManagedEc2EcsComputeEnvironment(scope, computeEnvName, {
        useOptimalInstanceClasses: true,
        instanceRole: new Role(scope, 'ComputeEnvironmentRoleOnDemandCPU', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role'),
                s3Policy,
            ],
        }),
        vpc,
        vpcSubnets: {
            subnetType: isPrivate ? SubnetType.PRIVATE_WITH_EGRESS : SubnetType.PUBLIC,
        },
        computeEnvironmentName: computeEnvName,
        securityGroups: [sg],
        minvCpus: 0,
        maxvCpus: 256,
        enabled: true,
        instanceTypes: [new InstanceType('c5'), new InstanceType('g5')]
    })


    const computeEnvSpotCPU = new ManagedEc2EcsComputeEnvironment(scope, 'ComputeEnvSpotCPU', {
        // useOptimalInstanceClasses: true,
        instanceRole: new Role(scope, 'ComputeEnvironmentRoleSpotCPU', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role'),
                s3Policy,
            ],
        }),
        vpc,
        vpcSubnets: {
            subnetType: isPrivate ? SubnetType.PRIVATE_WITH_EGRESS : SubnetType.PUBLIC,
        },
        instanceTypes: [
            new InstanceType('optimal')
            // ADD MORE INSTANCES TYPES (CPU)
        ],
        securityGroups: [sg],
        minvCpus: 0,
        maxvCpus: 256,
        enabled: true,
        computeEnvironmentName: 'ComputeEnvSpotCPU',
        spot: true,
        spotBidPercentage: 100,
        allocationStrategy: AllocationStrategy.SPOT_CAPACITY_OPTIMIZED,
    });


    // =================COMPUTE ENVIRONMENTS GPU=================

    const computeEnvOnDemandGPU = new ManagedEc2EcsComputeEnvironment(scope, 'ComputeEnvOnDemandGPU', {
        instanceRole: new Role(scope, 'ComputeEnvironmentRoleOnDemandGPU', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role'),
                s3Policy,
            ],
        }),
        vpc,
        vpcSubnets: {
            subnetType: isPrivate ? SubnetType.PRIVATE_WITH_EGRESS : SubnetType.PUBLIC,
        },
        instanceTypes: [
            new InstanceType('g5')
            // ADD MORE INSTANCES TYPES (GPU)
        ],
        computeEnvironmentName: 'ComputeEnvOnDemandGPU',
        securityGroups: [sg],
        minvCpus: 0,
        maxvCpus: 256,
        enabled: true,
    })

    const computeEnvSpotGPU = new ManagedEc2EcsComputeEnvironment(scope, 'ComputeEnvSpotGPU', {
        // useOptimalInstanceClasses: true,
        instanceRole: new Role(scope, 'ComputeEnvironmentRoleSpotGPU', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role'),
                s3Policy,
            ],
        }),
        vpc,
        vpcSubnets: {
            subnetType: isPrivate ? SubnetType.PRIVATE_WITH_EGRESS : SubnetType.PUBLIC,
        },
        instanceTypes: [
            new InstanceType('g5')
        ],
        securityGroups: [sg],
        minvCpus: 0,
        maxvCpus: 256,
        enabled: true,
        computeEnvironmentName: 'ComputeEnvSpotGPU',
        spot: true,
        spotBidPercentage: 100,
        allocationStrategy: AllocationStrategy.SPOT_CAPACITY_OPTIMIZED,
    });


    // =================JOB QUEUES CPU=================
    const jobQueueSpotCPU = new JobQueue(scope, 'JobQueueSpotCPU', {
        computeEnvironments: [{
            computeEnvironment: computeEnvSpotCPU,
            order: 1,
        }],
        jobQueueName: 'JobQueueSpotCPU',
        priority: 10,
    });

    const jobQueueOnDemandCPU = new JobQueue(scope, 'JobQueueOnDemandCPU', {
        computeEnvironments: [{
            computeEnvironment: computeEnvOnDemandCPU,
            order: 1,
        }],
        priority: 10,
        jobQueueName: 'JobQueueOnDemandCPU',
    });


    // =================JOB QUEUES GPU=================
    const jobQueueSpotGPU = new JobQueue(scope, 'JobQueueSpotGPU', {
        computeEnvironments: [{
            computeEnvironment: computeEnvSpotGPU,
            order: 1,
        }],
        jobQueueName: 'JobQueueSpotGPU',
        priority: 10,
    });

    const jobQueueOnDemandGPU = new JobQueue(scope, 'JobQueueOnDemandGPU', {
        computeEnvironments: [{
            computeEnvironment: computeEnvOnDemandGPU,
            order: 1,
        }],
        jobQueueName: 'JobQueueOnDemandGPU',
        priority: 10,
    });


    // Context param ex: "GPU-4.0.0,CPU-4.0.0,CPU-3.6.0"

    let blenderList = blenderVersionsList.split(',').map(version => version.toLowerCase());
    console.log('blenderList: ', blenderList);


    blenderList.map((version, index) => {
        new EcsJobDefinition(scope, `${jobDefnName}-${index}`, {
            timeout: cdk.Duration.minutes(1),
            retryAttempts: 1,
            jobDefinitionName: `${jobDefnName}-${index}`,
            container: new EcsEc2ContainerDefinition(scope, `${containerDefnName}-${index}`, {
                image: ContainerImage.fromEcrRepository(ecrRepository, version),
                memory: cdk.Size.mebibytes(2048),
                cpu: 1,
                volumes: [EcsVolume.efs({
                    name: 'efs-volume',
                    fileSystem: efs,
                    containerPath: '/mnt/efs',
                    rootDirectory: '/',
                    enableTransitEncryption: true,
                })],
            }),
        });
    });


}