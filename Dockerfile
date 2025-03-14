name: Build Plugin with Docker and Extract Package

on:
  push:
    branches: [main]
  workflow_dispatch:  # Permite ejecutarlo manualmente

jobs:
  build-and-package:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -t grafana-plugin-builder .

      - name: Create a container from the built image
        run: |
          docker create --name grafana-plugin-container grafana-plugin-builder

      - name: Extract the package from the container
        run: |
          docker cp grafana-plugin-container:/package/grafana_plugin.tar.gz .

      - name: Upload package as artifact
        uses: actions/upload-artifact@v4
        with:
          name: grafana-plugin
          path: grafana_plugin.tar.gz
