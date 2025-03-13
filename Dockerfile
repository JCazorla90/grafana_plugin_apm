FROM grafana/grafana:9.5.3

USER root
RUN apk add --no-cache nodejs npm

COPY dist /var/lib/grafana/plugins/spring-boot-apm-panel

COPY grafana.ini /etc/grafana/grafana.ini
COPY provisioning /etc/grafana/provisioning

RUN chown -R grafana:grafana /var/lib/grafana/plugins && \
    npm cache clean --force

USER grafana
EXPOSE 3000
