FROM grafana/grafana:latest

USER root

# Instalar Node.js y npm en la imagen
RUN apk add --no-cache nodejs npm

# Crear directorio de trabajo
WORKDIR /usr/src/app

# Copiar todo el código fuente
COPY . ./

# Compilar el código para generar `dist/`
RUN npm run build || echo "No se generó dist/"

# Verificar si `dist/` se creó correctamente
RUN ls -lah /usr/src/app/dist || echo " WARNING: No se generó dist/"

# Copiar el plugin generado a Grafana
COPY --from=0 /usr/src/app/dist /var/lib/grafana/plugins/spring-boot-apm-panel

# Permitir plugins no firmados
ENV GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=spring-boot-apm-panel

# Exponer puerto por defecto de Grafana
EXPOSE 3000

# Ejecutar Grafana
CMD ["/run.sh"]
