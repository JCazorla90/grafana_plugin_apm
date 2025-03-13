## Características principales

- **Visualizaciones interactivas con D3.js**
- **Métricas específicas para Spring Boot**
- **Integración con Amazon EKS**
- **Soporte para Prometheus como fuente de datos**

## Requisitos previos

- **Grafana 7.0+**
- **Node.js 14+**
- **npm 6+**
- **Cluster EKS con microservicios Spring Boot**

## Instalación

1. **Instala las herramientas necesarias**:
```

npm install -g @grafana/toolkit

```

2. ** Hazte un clone  de este repositorio**:
```

git clone https://github.com/yourusername/grafana_plugin_apm.git
cd grafana_plugin_apm

```

3. **Instalamos las dependencias**:
```

npm install

```

4. **Construimos el plugin**:
```

npm run build

```

5. **Hay que crear un archivo ZIP para distribución**:
```

npx @grafana/toolkit plugin:build

```

6. **Copia la carpeta del plugin a la carpeta de plugins de Grafana**:
```

cp -r dist /var/lib/grafana/plugins/spring-boot-apm-panel

```

7. **Actualiza la configuración de Grafana para permitir plugins sin firmar**:
```

[plugins]
allow_loading_unsigned_plugins = spring-boot-apm-panel

```

8. **Reinicia Grafana**:
```

sudo systemctl restart grafana-server

```

## Configuración de Spring Boot

Chequea que tus aplicaciones Spring Boot incluyan las siguientes dependencias:

```

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

Configura `application.properties` o `application.yml`:

```

management:
endpoints:
web:
exposure:
include: health,info,prometheus
metrics:
export:
prometheus:
enabled: true
distribution:
percentiles-histogram:
http:
server:
requests: true

```

## Configuración de Kubernetes

Crea un ConfigMap en Kubernetes para scrapear métricas desde Prometheus

```

apiVersion: v1
kind: ConfigMap
metadata:
name: prometheus-config
namespace: monitoring
data:
prometheus.yml: |
global:
scrape_interval: 15s
scrape_configs:
- job_name: 'spring-boot'
kubernetes_sd_configs:
- role: pod
relabel_configs:
- source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
action: keep
regex: true
- source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
action: replace
target_label: __metrics_path__
regex: (.+)
- source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
action: replace
regex: ([^:]+)(?::\d+)?;(\d+)
replacement: \$1:\$2
target_label: __address__
- action: labelmap
regex: __meta_kubernetes_pod_label_(.+)
- source_labels: [__meta_kubernetes_namespace]
action: replace
target_label: kubernetes_namespace
- source_labels: [__meta_kubernetes_pod_name]
action: replace
target_label: kubernetes_pod_name

```

## Uso

1. **En Grafana, tienes que ir a "Configuration" > "Plugins"**.
2. **Busca "Spring Boot APM Panel" y habilítalo**.
3. **Crea un nuevo dashboard y añade el panel "Spring Boot APM"**.
4. **Configure la fuente de datos Prometheus y seleccione las métricas deseadas**.

## Contribución

Las contribuciones son bienvenidas. Por favor, abra un issue o envíe un pull request con sus sugerencias.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Consulte el archivo [LICENSE](LICENSE) para más detalles.


