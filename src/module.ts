import { PanelPlugin } from '@grafana/data';
import { SpringBootAPMOptions } from './types';
import { SpringBootAPMPanel } from './SpringBootAPMPanel';

export const plugin = new PanelPlugin<SpringBootAPMOptions>(SpringBootAPMPanel).setPanelOptions(builder => {
  return builder
    // Opciones de visualización
    .addBooleanSwitch({
      path: 'showEndpoints',
      name: 'Mostrar Endpoints',
      defaultValue: true,
      description: 'Mostrar información de endpoints REST',
    })
    .addBooleanSwitch({
      path: 'showDatabaseQueries',
      name: 'Mostrar Consultas DB',
      defaultValue: true,
      description: 'Mostrar métricas de consultas a base de datos',
    })
    .addBooleanSwitch({
      path: 'showExternalCalls',
      name: 'Mostrar Llamadas Externas',
      defaultValue: true,
      description: 'Mostrar llamadas a servicios externos',
    })
    .addBooleanSwitch({
      path: 'showJVMMetrics',
      name: 'Mostrar Métricas JVM',
      defaultValue: true,
      description: 'Mostrar información de la JVM (memoria, GC, etc.)',
    })
    
    // Umbrales
    .addNumberInput({
      path: 'slowResponseThreshold',
      name: 'Umbral de Respuesta Lenta (ms)',
      defaultValue: 1000,
      description: 'Tiempo de respuesta considerado lento (milisegundos)',
    })
    
    // Colores
    .addColorPicker({
      path: 'normalColor',
      name: 'Color Normal',
      defaultValue: 'rgba(50, 172, 45, 0.97)',
    })
    .addColorPicker({
      path: 'warningColor',
      name: 'Color Advertencia',
      defaultValue: 'rgba(237, 129, 40, 0.89)',
    })
    .addColorPicker({
      path: 'criticalColor',
      name: 'Color Crítico',
      defaultValue: 'rgba(245, 54, 54, 0.9)',
    })
    
    // Opciones adicionales
    .addBooleanSwitch({
      path: 'groupByService',
      name: 'Agrupar por Servicio',
      defaultValue: true,
      description: 'Agrupar métricas por nombre de servicio',
    })
    .addNumberInput({
      path: 'maxEndpointsToShow',
      name: 'Máximo de Endpoints',
      defaultValue: 10,
      description: 'Número máximo de endpoints a mostrar',
    });
});
