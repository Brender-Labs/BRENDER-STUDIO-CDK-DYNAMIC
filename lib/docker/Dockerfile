# Utiliza una imagen base de Python
FROM python:3.8

# Instala las dependencias necesarias
RUN apt-get update && apt-get install -y \
    nfs-common \
    tree \
 && rm -rf /var/lib/apt/lists/*

# Define la ruta de montaje de EFS
# ARG EFS_MOUNT_POINT=/mnt/efs

RUN pip install boto3
RUN pip install requests

# Crea el directorio de trabajo
WORKDIR /

# Copia el código Python al contenedor
COPY list_efs_path.py /

RUN chmod +x list_efs_path.py

# Establece el punto de entrada del contenedor
ENTRYPOINT ["python", "list_efs_path.py"]
