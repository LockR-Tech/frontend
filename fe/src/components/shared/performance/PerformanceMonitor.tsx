/**
 * Performance Monitoring Component
 * Theo dõi và report Web Vitals
 */

import { useEffect } from "react";

// Types for Web Vitals
interface Metric {
  id: string;
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  entries: PerformanceEntry[];
}

type ReportHandler = (metric: Metric) => void;

// Web Vitals observer
function observe(metricName: string, callback: ReportHandler): (() => void) | void {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        callback({
          id: entry.name,
          name: metricName,
          value: entry.startTime,
          rating: "good",
          delta: 0,
          entries: [entry],
        });
      });
    });

    observer.observe({ type: metricName, buffered: true });
    return () => observer.disconnect();
  } catch (e) {
    console.warn(`Failed to observe ${metricName}:`, e);
  }
}

// Measure LCP
function observeLCP(callback: ReportHandler): (() => void) | void {
  return observe("largest-contentful-paint", callback);
}

// Measure FID
function observeFID(callback: ReportHandler): (() => void) | void {
  return observe("first-input", callback);
}

// Measure CLS
function observeCLS(callback: ReportHandler): (() => void) | void {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

  let clsValue = 0;
  let clsEntries: PerformanceEntry[] = [];

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsEntries.push(entry);
        clsValue += (entry as any).value;
      }
    }
    callback({
      id: "cls",
      name: "CLS",
      value: clsValue,
      rating: clsValue < 0.1 ? "good" : clsValue < 0.25 ? "needs-improvement" : "poor",
      delta: clsValue,
      entries: clsEntries,
    });
  });

  observer.observe({ type: "layout-shift", buffered: true });
  return () => observer.disconnect();
}

// Measure FCP
function observeFCP(callback: ReportHandler): (() => void) | void {
  return observe("paint", (metric) => {
    if (metric.id === "first-contentful-paint") {
      callback(metric);
    }
  });
}

// Measure TTFB
function observeTTFB(callback: ReportHandler): void {
  if (typeof window === "undefined") return;

  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
  if (navigation) {
    callback({
      id: "ttfb",
      name: "TTFB",
      value: navigation.responseStart - navigation.startTime,
      rating: "good",
      delta: 0,
      entries: [navigation],
    });
  }
}

export function PerformanceMonitor() {
  useEffect(() => {
    // Only monitor in development or if explicitly enabled
    if (import.meta.env.PROD && !localStorage.getItem("DEBUG_PERFORMANCE")) {
      return;
    }

    console.log("[Performance] Starting monitoring...");

    const cleanupFns: (() => void)[] = [];

    // Log all metrics
    const logMetric = (metric: Metric) => {
      console.log(`[Performance] ${metric.name}:`, metric.value, metric.rating);
    };

    const lcpCleanup = observeLCP(logMetric);
    const fidCleanup = observeFID(logMetric);
    const clsCleanup = observeCLS(logMetric);
    const fcpCleanup = observeFCP(logMetric);
    
    if (lcpCleanup) cleanupFns.push(lcpCleanup);
    if (fidCleanup) cleanupFns.push(fidCleanup);
    if (clsCleanup) cleanupFns.push(clsCleanup);
    if (fcpCleanup) cleanupFns.push(fcpCleanup);
    
    observeTTFB(logMetric);

    // Log bundle sizes
    if (performance.getEntriesByType) {
      const resources = performance.getEntriesByType("resource");
      const jsResources = resources.filter((r) => r.name.endsWith(".js"));
      const totalJsSize = jsResources.reduce((acc, r) => acc + (r as PerformanceResourceTiming).encodedBodySize, 0);
      console.log(`[Performance] Total JS loaded: ${(totalJsSize / 1024 / 1024).toFixed(2)} MB`);
    }

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, []);

  return null;
}

// Hook to measure component render time
export function useRenderTime(componentName: string) {
  useEffect(() => {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (duration > 16) {
        console.warn(`[Performance] ${componentName} took ${duration.toFixed(2)}ms to render`);
      }
    };
  }, [componentName]);
}

// Hook to measure expensive operations
export function useMeasureOperation(name: string) {
  return {
    start: () => performance.mark(`${name}-start`),
    end: () => {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      const measure = performance.getEntriesByName(name)[0];
      if (measure && measure.duration > 50) {
        console.warn(`[Performance] ${name} took ${measure.duration.toFixed(2)}ms`);
      }
    },
  };
}

export default PerformanceMonitor;
