FROM grafana/grafana:latest

USER root

RUN apk add --no-cache nodejs npm

WORKDIR /usr/src/app
COPY grafana_plugin_apm /usr/src/app

RUN npm install

COPY dist /var/lib/grafana/plugins/spring-boot-apm-panel

ENV GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=spring-boot-apm-panel

EXPOSE 3000

CMD ["/run.sh"]
