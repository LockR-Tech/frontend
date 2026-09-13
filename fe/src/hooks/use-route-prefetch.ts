/**
 * Route Prefetching Hook
 * Tự động prefetch routes khi user hover vào links
 */

import { useCallback, useEffect, useRef } from "react";

// Các routes phổ biến cần prefetch
const POPULAR_ROUTES = [
  () => import("~/pages/Admin/users"),
  () => import("~/pages/Admin/orders"),
  () => import("~/pages/Admin/stores"),
  () => import("~/pages/Admin/lockers"),
];

// Prefetch sau khi initial load
export function useInitialPrefetch() {
  useEffect(() => {
    // Prefetch các routes phổ biến sau khi app đã load (low priority)
    const timer = setTimeout(() => {
      if ("requestIdleCallback" in window) {
        requestIdleCallback(() => {
          POPULAR_ROUTES.forEach((route) => {
            route().catch(() => {
              // Ignore prefetch errors
            });
          });
        }, { timeout: 2000 });
      }
    }, 3000); // Chờ 3s sau khi app load

    return () => clearTimeout(timer);
  }, []);
}

// Prefetch on hover
export function usePrefetchRoute() {
  const prefetchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefetch = useCallback((route: () => Promise<unknown>) => {
    // Clear previous timeout
    if (prefetchTimeout.current) {
      clearTimeout(prefetchTimeout.current);
    }

    // Delay prefetch để tránh prefetch khi user chỉ di chuột qua nhanh
    prefetchTimeout.current = setTimeout(() => {
      route().catch(() => {
        // Ignore prefetch errors
      });
    }, 100);
  }, []);

  const cancelPrefetch = useCallback(() => {
    if (prefetchTimeout.current) {
      clearTimeout(prefetchTimeout.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (prefetchTimeout.current) {
        clearTimeout(prefetchTimeout.current);
      }
    };
  }, []);

  return { prefetch, cancelPrefetch };
}

// Image lazy loading hook
export function useLazyImage() {
  useEffect(() => {
    // Check if IntersectionObserver is supported
    if (!("IntersectionObserver" in window)) return;

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
            img.classList.remove("lazy-image");
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: "50px 0px", // Load trước 50px khi scroll đến
      threshold: 0.01,
    });

    // Observe all lazy images
    document.querySelectorAll("img[data-src]").forEach((img) => {
      imageObserver.observe(img);
    });

    return () => imageObserver.disconnect();
  }, []);
}

// Memoize expensive computations
export function useMemoizedValue<T>(value: T, deps: unknown[]): T {
  const cache = useRef<Map<string, T>>(new Map());
  const key = JSON.stringify(deps);

  if (cache.current.has(key)) {
    return cache.current.get(key)!;
  }

  cache.current.set(key, value);
  return value;
}
