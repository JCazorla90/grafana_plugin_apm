import React, { useRef, useEffect } from 'react';
import { PanelProps } from '@grafana/data';
import { SpringBootAPMOptions } from 'types';
import * as d3 from 'd3';
import _ from 'lodash';

interface Props extends PanelProps<SpringBootAPMOptions> {}

// Interfaces para datos de telemetría
interface ServiceMetric {
  serviceName: string;
  namespace: string;
  pod: string;
  endpoint?: string;
  responseTime?: number;
  errorRate?: number;
  callCount?: number;
  type: 'endpoint' | 'database' | 'external' | 'jvm';
  status?: 'normal' | 'warning' | 'critical';
  databaseType?: string;
  query?: string;
  jvmMetric?: string;
  jvmValue?: number;
  timestamp?: number;
}

export const SpringBootAPMPanel: React.FC<Props> = ({ options, data, width, height }) => {
  const d3Container = useRef(null);

  // Procesar datos de telemetría
  const processData = (): ServiceMetric[] => {
    const metrics: ServiceMetric[] = [];
    
    if (!data || !data.series || data.series.length === 0) {
      return metrics;
    }
    
    // Procesar cada serie de datos
    data.series.forEach(series => {
      // Extrae los campos relevantes de la serie
      const serviceNameField = series.fields.find(field => field.name === 'serviceName' || field.name === 'service');
      const namespaceField = series.fields.find(field => field.name === 'namespace');
      const podField = series.fields.find(field => field.name === 'pod' || field.name === 'instance');
      const endpointField = series.fields.find(field => field.name === 'endpoint' || field.name === 'uri');
      const responseTimeField = series.fields.find(field => field.name === 'responseTime' || field.name === 'duration');
      const errorRateField = series.fields.find(field => field.name === 'errorRate');
      const callCountField = series.fields.find(field => field.name === 'callCount' || field.name === 'count');
      const typeField = series.fields.find(field => field.name === 'type');
      const databaseTypeField = series.fields.find(field => field.name === 'databaseType');
      const queryField = series.fields.find(field => field.name === 'query');
      const jvmMetricField = series.fields.find(field => field.name === 'jvmMetric');
      const jvmValueField = series.fields.find(field => field.name === 'jvmValue');
      const timestampField = series.fields.find(field => field.name === 'time');
      
      // Iterar a través de los valores de las series
      const length = serviceNameField?.values.length || 0;
      for (let i = 0; i < length; i++) {
        const serviceName = serviceNameField?.values.get(i) || 'unknown';
        const namespace = namespaceField?.values.get(i) || 'default';
        const pod = podField?.values.get(i) || 'unknown';
        const endpoint = endpointField?.values.get(i);
        const responseTime = responseTimeField?.values.get(i);
        const errorRate = errorRateField?.values.get(i);
        const callCount = callCountField?.values.get(i);
        const type = typeField?.values.get(i) || 'endpoint';
        const databaseType = databaseTypeField?.values.get(i);
        const query = queryField?.values.get(i);
        const jvmMetric = jvmMetricField?.values.get(i);
        const jvmValue = jvmValueField?.values.get(i);
        const timestamp = timestampField?.values.get(i);
        
        // Determinar estado basado en umbrales
        let status: 'normal' | 'warning' | 'critical' = 'normal';
        if (responseTime) {
          if (responseTime > options.slowResponseThreshold * 2) {
            status = 'critical';
          } else if (responseTime > options.slowResponseThreshold) {
            status = 'warning';
          }
        }
        
        // Si hay tasa de error, puede afectar el estado
        if (errorRate && errorRate > 5) {
          status = 'critical';
        } else if (errorRate && errorRate > 1) {
          status = 'warning';
        }
        
        // Crear objeto de métrica
        const metric: ServiceMetric = {
          serviceName,
          namespace,
          pod,
          type: type as any,
          status,
          timestamp,
        };
        
        // Añadir campos específicos según el tipo
        if (type === 'endpoint' || type === 'external') {
          metric.endpoint = endpoint;
          metric.responseTime = responseTime;
          metric.errorRate = errorRate;
          metric.callCount = callCount;
        } else if (type === 'database') {
          metric.databaseType = databaseType;
          metric.query = query;
          metric.responseTime = responseTime;
          metric.callCount = callCount;
        } else if (type === 'jvm') {
          metric.jvmMetric = jvmMetric;
          metric.jvmValue = jvmValue;
        }
        
        metrics.push(metric);
      }
    });
    
    return metrics;
  };

  useEffect(() => {
    if (d3Container.current) {
      // Procesar los datos
      const metrics = processData();
      
      if (metrics.length === 0) {
        // No hay datos para mostrar
        drawNoDataMessage();
        return;
      }
      
      // Filtrar datos según las opciones seleccionadas
      const filteredMetrics = metrics.filter(metric => {
        if (metric.type === 'endpoint' && !options.showEndpoints) return false;
        if (metric.type === 'database' && !options.showDatabaseQueries) return false;
        if (metric.type === 'external' && !options.showExternalCalls) return false;
        if (metric.type === 'jvm' && !options.showJVMMetrics) return false;
        return true;
      });
      
      // Agrupar datos si es necesario
      let displayData = filteredMetrics;
      if (options.groupByService) {
        const groupedMetrics = _.groupBy(filteredMetrics, 'serviceName');
        // Transformar los datos agrupados según sea necesario
        // (implementación simplificada)
      }
      
      // Limitar número de endpoints si es necesario
      if (options.maxEndpointsToShow > 0) {
        const endpointMetrics = displayData.filter(m => m.type === 'endpoint');
        if (endpointMetrics.length > options.maxEndpointsToShow) {
          // Ordenar por tiempo de respuesta y tomar los top N
          const sortedEndpoints = [...endpointMetrics].sort((a, b) => 
            (b.responseTime || 0) - (a.responseTime || 0)
          );
          const topEndpoints = sortedEndpoints.slice(0, options.maxEndpointsToShow);
          
          // Reemplazar los endpoints en los datos de visualización
          displayData = displayData.filter(m => m.type !== 'endpoint').concat(topEndpoints);
        }
      }
      
      // Llamar a la función de dibujo con los datos procesados
      drawVisualization(displayData);
    }
  }, [data, width, height, options]);

  // Función para dibujar la visualización
  const drawVisualization = (metrics: ServiceMetric[]) => {
    // Limpiar visualización anterior
    d3.select(d3Container.current).selectAll("*").remove();
    
    // Configurar dimensiones y márgenes
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Crear el SVG
    const svg = d3.select(d3Container.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Agrupar métricas por tipo
    const endpointMetrics = metrics.filter(m => m.type === 'endpoint');
    const databaseMetrics = metrics.filter(m => m.type === 'database');
    const externalMetrics = metrics.filter(m => m.type === 'external');
    const jvmMetrics = metrics.filter(m => m.type === 'jvm');
    
    // Función para obtener el color según el estado
    const getColor = (status: string) => {
      switch(status) {
        case 'critical': return options.criticalColor;
        case 'warning': return options.warningColor;
        default: return options.normalColor;
      }
    };
    
    // Crear gráficos según el tipo de métrica
    
    // Si hay métricas de endpoints, crear gráfico de barras para tiempos de respuesta
    if (endpointMetrics.length > 0) {
      drawEndpointChart(svg, endpointMetrics, innerWidth, innerHeight * 0.4, 0);
    }
    
    // Si hay métricas de base de datos, crear gráfico para consultas
    if (databaseMetrics.length > 0 && options.showDatabaseQueries) {
      const yOffset = endpointMetrics.length > 0 ? innerHeight * 0.45 : 0;
      drawDatabaseChart(svg, databaseMetrics, innerWidth, innerHeight * 0.25, yOffset);
    }
    
    // Si hay métricas JVM, crear gráficos para ellas
    if (jvmMetrics.length > 0 && options.showJVMMetrics) {
      const yOffset = (endpointMetrics.length > 0 ? 0.45 : 0) + 
                     (databaseMetrics.length > 0 ? 0.25 : 0);
      drawJVMChart(svg, jvmMetrics, innerWidth, innerHeight * 0.25, innerHeight * yOffset);
    }
  };
  
  // Función para dibujar gráfico de endpoints
  const drawEndpointChart = (svg: any, metrics: ServiceMetric[], width: number, height: number, yOffset: number) => {
    // Ordenar por tiempo de respuesta (descendente)
    const sortedMetrics = [...metrics].sort((a, b) => (b.responseTime || 0) - (a.responseTime || 0));
    
    // Escalas
    const xScale = d3.scaleBand()
      .domain(sortedMetrics.map(m => m.endpoint || ''))
      .range([0, width])
      .padding(0.2);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(sortedMetrics, d => d.responseTime) || 1000])
      .range([height, 0]);
    
    // Grupo para esta sección
    const group = svg.append('g')
      .attr('transform', `translate(0,${yOffset})`);
    
    // Título de sección
    group.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Response Time by Endpoint (ms)');
    
    // Ejes
    group.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');
    
    group.append('g')
      .call(d3.axisLeft(yScale));
    
    // Umbral de respuesta lenta
    if (options.slowResponseThreshold > 0) {
      group.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yScale(options.slowResponseThreshold))
        .attr('y2', yScale(options.slowResponseThreshold))
        .attr('stroke', options.warningColor)
        .attr('stroke-dasharray', '5,5');
      
      group.append('text')
        .attr('x', width)
        .attr('y', yScale(options.slowResponseThreshold) - 5)
        .style('text-anchor', 'end')
        .style('font-size', '10px')
        .text(`Slow Threshold (${options.slowResponseThreshold}ms)`);
    }
    
    // Barras
    group.selectAll('.bar')
      .data(sortedMetrics)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.endpoint || '') || 0)
      .attr('y', d => yScale(d.responseTime || 0))
      .attr('width', xScale.bandwidth())
      .attr('height', d => height - yScale(d.responseTime || 0))
      .attr('fill', d => {
        if (d.status === 'critical') return options.criticalColor;
        if (d.status === 'warning') return options.warningColor;
        return options.normalColor;
      });
    
    // Mostrar valor encima de cada barra
    group.selectAll('.bar-value')
      .data(sortedMetrics)
      .enter()
      .append('text')
      .attr('class', 'bar-value')
      .attr('x', d => (xScale(d.endpoint || '') || 0) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.responseTime || 0) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .text(d => `${Math.round(d.responseTime || 0)}ms`);
  };
  
  // Función para dibujar gráfico de métricas de base de datos
  const drawDatabaseChart = (svg: any, metrics: ServiceMetric[], width: number, height: number, yOffset: number) => {
    // Implementación similar al gráfico de endpoints pero para métricas de base de datos
    // Dependiendo de los datos, podría ser un gráfico diferente
    
    // Grupo para esta sección
    const group = svg.append('g')
      .attr('transform', `translate(0,${yOffset})`);
    
    // Título de sección
    group.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Database Query Performance');
    
    // Implementar visualización de consultas de base de datos
    // (se podría mostrar como una tabla o un gráfico dependiendo de los datos)
  };
  
  // Función para dibujar gráfico de métricas JVM
  const drawJVMChart = (svg: any, metrics: ServiceMetric[], width: number, height: number, yOffset: number) => {
    // Grupo para esta sección
    const group = svg.append('g')
      .attr('transform', `translate(0,${yOffset})`);
    
    // Título de sección
    group.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('JVM Metrics');
    
    // Implementar visualización de métricas JVM
    // (Podría ser un gauge chart para memoria, gráfico de líneas para GC, etc.)
  };
  
  // Función para mostrar mensaje cuando no hay datos
  const drawNoDataMessage = () => {
    // Limpiar visualización anterior
    d3.select(d3Container.current).selectAll("*").remove();
    
    const svg = d3.select(d3Container.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('No data available for selected options');
  };

  return <div ref={d3Container} style={{ width, height }} />;
};
