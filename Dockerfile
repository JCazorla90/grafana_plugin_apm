FROM grafana/grafana:latest

USER root

# Instalar Node.js y npm en la imagen
RUN apk add --no-cache nodejs npm

# Crear directorio de trabajo
WORKDIR /usr/src/app

# Copiar solo package.json y package-lock.json para optimizar caché
COPY package.json package-lock.json ./

# Instalar dependencias antes de copiar el código
RUN npm install

# Copiar el código fuente después de instalar dependencias
COPY . ./

# Construir el plugin
RUN npm run build

# Ahora `dist/` debe existir, podemos copiarla
COPY dist /var/lib/grafana/plugins/spring-boot-apm-panel

# Permitir plugins no firmados
ENV GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=spring-boot-apm-panel

# Exponer puerto por defecto de Grafana
EXPOSE 3000

# Ejecutar Grafana
CMD ["/run.sh"]
