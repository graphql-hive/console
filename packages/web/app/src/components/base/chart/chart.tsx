import { useEffect, useLayoutEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

export type ChartEvents = Record<string, (params: any) => void>;

type ChartProps = {
  option: EChartsOption;
  height: number;
  onEvents?: ChartEvents;
};

/**
 * One ECharts instance, sized by its container's width and the given height.
 *
 * Owns the instance directly rather than through echarts-for-react, which creates a throwaway
 * instance and waits for it to render before making the real one: a re-render in that gap drew
 * the chart on the throwaway, so every chart animated in twice.
 */
export function Chart({ option, height, onEvents }: ChartProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }
    const chart = echarts.init(element);
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // Merged, not replaced, so a re-render with the same data does not replay the entry animation.
  useLayoutEffect(() => {
    chartRef.current?.setOption(option);
  }, [option]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !onEvents) {
      return;
    }
    const entries = Object.entries(onEvents);
    for (const [name, handler] of entries) {
      chart.on(name, handler);
    }
    return () => {
      for (const [name, handler] of entries) {
        chart.off(name, handler);
      }
    };
  }, [onEvents]);

  return <div ref={elementRef} className="w-full" style={{ height }} />;
}
