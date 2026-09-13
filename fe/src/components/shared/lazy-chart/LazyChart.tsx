/**
 * Lazy Loaded Chart Component
 * Chỉ load chart library khi component hiển thị
 */

import { useEffect, useState, useRef } from "react";
import { Skeleton } from "~/components/ui/skeleton";

interface LazyChartProps {
  data: unknown[];
  isLoading?: boolean;
  renderChart: (data: unknown[]) => React.ReactNode;
}

// Intersection Observer wrapper
export function LazyChart({ data, isLoading, renderChart }: LazyChartProps) {
  const [isVisible, setIsVisible] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (chartRef.current) {
      observer.observe(chartRef.current);
    }

    return () => observer.disconnect();
  }, []);

  if (isLoading) {
    return (
      <div className="h-[400px]">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  return (
    <div ref={chartRef} className="min-h-[400px]">
      {isVisible ? (
        renderChart(data)
      ) : (
        <div className="h-[400px] flex items-center justify-center">
          <Skeleton className="h-full w-full" />
        </div>
      )}
    </div>
  );
}

export default LazyChart;
