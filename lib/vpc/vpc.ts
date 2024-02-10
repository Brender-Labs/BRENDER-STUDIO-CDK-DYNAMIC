import { RemovalPolicy } from "aws-cdk-lib";
import { GatewayVpcEndpointAwsService, IVpc, InterfaceVpcEndpointAwsService, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

interface VpcProps {
    name: string;
    gatewayEndpointName: string;
}

export function createVpc(scope: Construct, props: VpcProps): IVpc {

    const vpc = new Vpc(scope, props.name, {
        natGateways: 0,
        subnetConfiguration: [
            {
                cidrMask: 24,
                name: 'public-subnet-1',
                subnetType: SubnetType.PUBLIC,
            },
            {
                cidrMask: 24,
                name: 'private-subnet-1',
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            }
        ],
    });

   const s3GatewayEndpoint =  vpc.addGatewayEndpoint(props.gatewayEndpointName, {
        service: GatewayVpcEndpointAwsService.S3,
    });

    vpc.applyRemovalPolicy(RemovalPolicy.DESTROY)

    return vpc;
}