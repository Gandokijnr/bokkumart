import { defineNuxtPlugin } from "#app";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart, BarChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  ToolboxComponent,
} from "echarts/components";
import VChart from "vue-echarts";

export default defineNuxtPlugin((nuxtApp) => {
  // Register ECharts components
  use([
    CanvasRenderer,
    LineChart,
    BarChart,
    PieChart,
    GridComponent,
    TooltipComponent,
    LegendComponent,
    TitleComponent,
    DataZoomComponent,
    ToolboxComponent,
  ]);

  // Register Vue-ECharts component globally
  nuxtApp.vueApp.component("VChart", VChart);
});
