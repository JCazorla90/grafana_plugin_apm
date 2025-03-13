# Grafana Plugin APM para Microservicios Spring Boot en EKS
Este plugin de Grafana utiliza D3.js para proporcionar visualizaciones avanzadas de Application Performance Monitoring (APM) específicamente diseñadas para microservicios Spring Boot desplegados en Amazon EKS.

##Características principales
Visualizaciones interactivas con D3.js

Métricas específicas para Spring Boot

Integración con Amazon EKS

Soporte para Prometheus como fuente de datos

##Requisitos previos
Grafana 7.0+

Node.js 14+

npm 6+

Cluster EKS con microservicios Spring Boot instrumentados



## Instalar herramientas necesarias
npm install -g @grafana/toolkit

## Crear un nuevo plugin
npx @grafana/toolkit plugin:create spring-boot-apm-panel

## Navegar al directorio del plugin
cd spring-boot-apm-panel

# Instalar dependencias adicionales
npm install d3 --save
npm install lodash --save


Para que el plugin funcione correctamente, necesitarás asegurarte de que las métricas estén disponibles.

# Construir el plugin
npm run build

# Crear un archivo ZIP para distribución
npx @grafana/toolkit plugin:build
El plugin empaquetado estará en la carpeta dist/

Copia la carpeta del plugin a la carpeta de plugins de Grafana cp -r dist /var/lib/grafana/plugins/spring-boot-apm-panel
Actualiza la configuración de Grafana para permitir plugins sin firmar
[plugins]
allow_loading_unsigned_plugins = spring-boot-apm-panel
Reinicia Grafana
sudo systemctl restart grafana-server

Configuración adicional para EKS y Spring Boot
Para que el plugin funcione correctamente, necesitarás:

Instrumentación adecuada en tus servicios Spring Boot:

Asegúrate de que tus aplicaciones Spring Boot incluyan las dependencias adecuadas:

spring-boot-starter-actuator
micrometer-registry-prometheus

# application.properties o application.yml
management.endpoints.web.exposure.include=health,info,prometheus
management.metrics.export.prometheus.enabled=true
management.metrics.distribution.percentiles-histogram.http.server.requests=true

# ConfigMap en Kubernetes para scrapear métricas desde Prometheus
(yaml de ejemplo)
