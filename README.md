# grafana_plugin_apm
Plugin de Grafana con D3.js enfocado en APM  para microservicios Spring Boot en un cluster EKS

# Instalar herramientas necesarias
npm install -g @grafana/toolkit

# Crear un nuevo plugin
npx @grafana/toolkit plugin:create spring-boot-apm-panel

# Navegar al directorio del plugin
cd spring-boot-apm-panel

# Instalar dependencias adicionales
npm install d3 --save
npm install lodash --save
