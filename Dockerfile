# Etapa de construcción
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copiar archivos necesarios
COPY package.json package-lock.json ./
RUN npm install

COPY . ./
RUN npm run build

# Comprimir el resultado
RUN tar -czvf grafana_plugin.tar.gz dist/

# Imagen final solo para empaquetado
FROM alpine:latest
WORKDIR /package

# Copiar el paquete desde builder
COPY --from=builder /usr/src/app/grafana_plugin.tar.gz .

CMD ["ls", "-lah", "/package"]

