# Primera etapa: Construcción del plugin
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copiar package.json y generar las dependencias
COPY package.json ./
RUN npm install --force

# Copiar el código fuente
COPY . ./

# Construir el plugin (esto generará `dist/`)
RUN npm run build || echo "⚠️ No se generó dist/"

# Segunda etapa: Imagen final con Grafana
FROM grafana/grafana:latest

USER root

# Copiar el plugin generado desde la etapa "builder"
COPY --from=builder /usr/src/app/dist /var/lib/grafana/plugins/spring-boot-apm-panel

# Permitir plugins no firmados
ENV GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=spring-boot-apm-panel

# Exponer puerto por defecto de Grafana
EXPOSE 3000

# Ejecutar Grafana
CMD ["/run.sh"]
