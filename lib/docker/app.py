import os
import boto3
import sys
import json

# Test env
test_env = os.environ['TEST_ENV']

print(f"Test Env: {test_env}")

# Get the index of the array job and size of the array job from the environment variables set by AWS Batch
int_idx_array = int(os.environ['AWS_BATCH_JOB_ARRAY_INDEX'])
array_size = int(os.environ['AWS_BATCH_JOB_ARRAY_SIZE'])
job_id = os.environ['AWS_BATCH_JOB_ID'] # Get the job ID to use as a unique identifier ex: 4fce4f74-96e4-4188-a07f-36898cfd75ab:29/
job_id_without_index = job_id.split(':')[0]

print(f"Matrix Index: {int_idx_array}")
print(f"Array Size Job: {array_size}")
print(f"Job ID: {job_id}")
print(f"Job Id Without Index: {job_id_without_index}")

# Get command line arguments
# args = sys.argv[1:]
# print(f"Command Line Arguments: {args}")

# Obtén el JSON como cadena desde los argumentos de la línea de comandos
json_str = sys.argv[1]

# Analiza el JSON
try:
    json_data = json.loads(json_str)
    print("Parsed JSON:")
    print(json.dumps(json_data, indent=2))  # Imprime el JSON con formato
except json.JSONDecodeError as e:
    print(f"Error parsing JSON: {e}")

# Print the content of /mnt
print("Content of /mnt:")
print(os.listdir('/mnt'))

# Print the tree of /mnt
print("Tree of /mnt:")
for root, dirs, files in os.walk('/mnt'):
    for name in files:
        print(os.path.join(root, name))
    for name in dirs:
        print(os.path.join(root, name))

# File path to the Blender file
mntPathEfs = '/mnt/efs/lambda/test.txt'

# Specify your S3 bucket name and desired output path
s3_bucket = 'brender-cdk-ecr-batch-s3-bucket'
s3_output_path = 'output/'

# If the index of the array job is the last one, run cameras_ngp.py to generate the JSON file
if int_idx_array + 1 == array_size:
    print("Executing last element of the array")
 
    # Read the content of the file
    with open(mntPathEfs, 'r') as file:
        file_content = file.read()
        print(file_content)



    # Upload the content to S3
    s3 = boto3.client('s3')
    s3.put_object(Bucket=s3_bucket, Key=s3_output_path + 'output.txt', Body=file_content)



else:
    print("Executing other elements of the array")
   
