import os
import boto3

def download_from_s3(bucket_name, object_key, local_path):
    s3 = boto3.client('s3')
    s3.download_file(bucket_name, object_key, local_path)

def main():
    efs_mount_point = os.environ['EFS_MOUNT_PATH']
    s3_bucket_name = os.environ['S3_BUCKET_NAME']
    s3_object_key = os.environ['S3_OBJECT_KEY']
    print(f'Ruta de montaje de EFS: {efs_mount_point}')

    # Carpeta donde se guardará el archivo descargado directamente en /lambda
    lambda_folder = 'lambda'

    # Extraer el nombre del archivo del object_key
    s3_file_name = os.path.basename(s3_object_key)

    # Descargar archivo de S3 y guardarlo en /lambda con el nombre original
    s3_file_path = os.path.join(efs_mount_point, lambda_folder, s3_file_name)
    download_from_s3(s3_bucket_name, s3_object_key, s3_file_path)
    print(f'Archivo descargado de S3 y guardado en {s3_file_path}')

    # Mostrar el contenido de /mnt
    print('Contenido de /mnt:')
    for filename in os.listdir(efs_mount_point):
        print(filename)

    # Mostrar la estructura de árbol de /mnt
    print('Árbol de /mnt:')
    for root, dirs, files in os.walk(efs_mount_point):
        for name in files:
            print(os.path.join(root, name))
        for name in dirs:
            print(os.path.join(root, name))

if __name__ == "__main__":
    main()
