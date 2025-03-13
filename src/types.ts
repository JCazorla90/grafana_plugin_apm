export interface SimpleOptions {
  color: string;
  showPoints: boolean;
  lineWidth: number;
  // Añade más opciones según sea necesario
}

// En src/module.ts
import { PanelPlugin } from '@grafana/data';
import { SimpleOptions } from './types';
import { SimplePanel } from './SimplePanel';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel).setPanelOptions(builder => {
  return builder
    .addColorPicker({
      path: 'color',
      name: 'Color de línea',
      defaultValue: 'rgba(0, 115, 191, 1)',
    })
    .addBooleanSwitch({
      path: 'showPoints',
      name: 'Mostrar puntos',
      defaultValue: false,
    })
    .addNumberInput({
      path: 'lineWidth',
      name: 'Grosor de línea',
      defaultValue: 1.5,
    });
});
