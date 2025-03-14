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
    
    data.series.forEach(series => {
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
        
        let status: 'normal' | 'warning' | 'critical' = 'normal';
        if (responseTime) {
          if (responseTime > options.slowResponseThreshold * 2) {
            status = 'critical';
          } else if (responseTime > options.slowResponseThreshold) {
            status = 'warning';
          }
        }
        
        if (errorRate && errorRate > 5) {
          status = 'critical';
        } else if (errorRate && errorRate > 1) {
          status = 'warning';
        }
        
        const metric: ServiceMetric = {
          serviceName,
          namespace,
          pod,
          type: type as any,
          status,
          timestamp,
        };
        
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
      const metrics = processData();
      
      if (metrics.length === 0) {
        drawNoDataMessage();
        return;
      }
      
      const filteredMetrics = metrics.filter(metric => {
        if (metric.type === 'endpoint' && !options.showEndpoints) return false;
        if (metric.type === 'database' && !options.showDatabaseQueries) return false;
        if (metric.type === 'external' && !options.showExternalCalls) return false;
        if (metric.type === 'jvm' && !options.showJVMMetrics) return false;
        return true;
      });
      
      let displayData = filteredMetrics;
      if (options.groupByService) {
        const groupedMetrics = _.groupBy(filteredMetrics, 'serviceName');
        displayData = Object.keys(groupedMetrics).flatMap(service => groupedMetrics[service]);
      }
      
      if (options.maxEndpointsToShow > 0) {
        const endpointMetrics = displayData.filter(m => m.type === 'endpoint');
        if (endpointMetrics.length > options.maxEndpointsToShow) {
          const sortedEndpoints = [...endpointMetrics].sort((a, b) => 
            (b.responseTime || 0) - (a.responseTime || 0)
          );
          const topEndpoints = sortedEndpoints.slice(0, options.maxEndpointsToShow);
          displayData = displayData.filter(m => m.type !== 'endpoint').concat(topEndpoints);
        }
      }
      
      drawVisualization(displayData);
    }
  }, [data, width, height, options]);

  const drawVisualization = (metrics: ServiceMetric[]) => {
    d3.select(d3Container.current).selectAll("*").remove();
    
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const svg = d3.select(d3Container.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const nodes: { id: string; type: string; status: string }[] = [];
    const links: { source: string; target: string; value?: number }[] = [];
    const nodeMap = new Map<string, { id: string; type: string; status: string }>();

    metrics.forEach(metric => {
      const serviceId = `${metric.serviceName}-${metric.namespace}`;
      if (!nodeMap.has(serviceId)) {
        nodeMap.set(serviceId, {
          id: serviceId,
          type: 'service',
          status: metric.status || 'normal',
        });
      }

      if (metric.type === 'endpoint' && metric.endpoint) {
        const endpointId = `${serviceId}-endpoint-${metric.endpoint}`;
        if (!nodeMap.has(endpointId)) {
          nodeMap.set(endpointId, {
            id: endpointId,
            type: 'endpoint',
            status: metric.status || 'normal',
          });
        }
        links.push({
          source: serviceId,
          target: endpointId,
          value: metric.responseTime,
        });
      } else if (metric.type === 'database' && metric.databaseType) {
        const dbId = `${serviceId}-db-${metric.databaseType}`;
        if (!nodeMap.has(dbId)) {
          nodeMap.set(dbId, {
            id: dbId,
            type: 'database',
            status: metric.status || 'normal',
          });
        }
        links.push({
          source: serviceId,
          target: dbId,
          value: metric.responseTime,
        });
      } else if (metric.type === 'external' && metric.endpoint) {
        const externalId = `${serviceId}-external-${metric.endpoint}`;
        if (!nodeMap.has(externalId)) {
          nodeMap.set(externalId, {
            id: externalId,
            type: 'external',
            status: metric.status || 'normal',
          });
        }
        links.push({
          source: serviceId,
          target: externalId,
          value: metric.responseTime,
        });
      }
    });

    nodes.push(...nodeMap.values());

    if (nodes.length === 0) {
      drawNoDataMessage();
      return;
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force('collision', d3.forceCollide().radius(30));

    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.sqrt(d.value || 1));

    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', (d) => (d.type === 'service' ? 10 : 7))
      .attr('fill', (d) => {
        switch (d.status) {
          case 'critical':
            return options.criticalColor;
          case 'warning':
            return options.warningColor;
          default:
            return options.normalColor;
        }
      })
      .call(
        d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    const labels = svg.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .attr('dy', -15)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .text((d) => d.id.split('-')[0]);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      labels
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  };

  const drawNoDataMessage = () => {
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

  // Funciones que no se usan en el grafo pero se mantienen por compatibilidad
  const drawEndpointChart = (svg: any, metrics: ServiceMetric[], width: number, height: number, yOffset: number) => {
    const sortedMetrics = [...metrics].sort((a, b) => (b.responseTime || 0) - (a.responseTime || 0));
    const xScale = d3.scaleBand()
      .domain(sortedMetrics.map(m => m.endpoint || ''))
      .range([0, width])
      .padding(0.2);
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(sortedMetrics, d => d.responseTime) || 1000])
      .range([height, 0]);
    const group = svg.append('g').attr('transform', `translate(0,${yOffset})`);
    group.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Response Time by Endpoint (ms)');
    group.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale));
    group.append('g').call(d3.axisLeft(yScale));
    group.selectAll('.bar')
      .data(sortedMetrics)
      .enter()
      .append('rect')
      .attr('x', d => xScale(d.endpoint || '') || 0)
      .attr('y', d => yScale(d.responseTime || 0))
      .attr('width', xScale.bandwidth())
      .attr('height', d => height - yScale(d.responseTime || 0))
      .attr('fill', d => d.status === 'critical' ? options.criticalColor : d.status === 'warning' ? options.warningColor : options.normalColor);
  };

  const drawDatabaseChart = (svg: any, metrics: ServiceMetric[], width: number, height: number, yOffset: number) => {
    const group = svg.append('g').attr('transform', `translate(0,${yOffset})`);
    group.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Database Query Performance');
  };

  const drawJVMChart = (svg: any, metrics: ServiceMetric[], width: number, height: number, yOffset: number) => {
    const group = svg.append('g').attr('transform', `translate(0,${yOffset})`);
    group.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('JVM Metrics');
  };

  return <div ref={d3Container} style={{ width, height }} />;
};
