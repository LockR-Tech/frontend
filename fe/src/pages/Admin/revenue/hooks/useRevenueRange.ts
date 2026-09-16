import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  defaultReportRange,
  isValidReportRange,
  type DateRangeValue,
} from "~/components/shared/reporting";

/**
 * Khoảng ngày dùng chung cho toàn bộ trang doanh thu: mọi endpoint `/api/admin/revenue/**`
 * phải nhận cùng một `from`/`to` thì các con số mới cộng khớp nhau.
 *
 * Khoảng nằm trên URL nên đường dẫn chia sẻ được và F5 không mất. Khoảng không hợp lệ
 * (đảo ngược hoặc quá 366 ngày) sẽ chặn gọi API thay vì để backend trả `INVALID_DATE_RANGE`.
 */
export function useRevenueRange() {
  const [urlParams, setUrlParams] = useSearchParams();

  const range: DateRangeValue = useMemo(() => {
    const fallback = defaultReportRange();
    return {
      from: urlParams.get("from") || fallback.from,
      to: urlParams.get("to") || fallback.to,
    };
  }, [urlParams]);

  const setRange = useCallback(
    (next: DateRangeValue) => {
      setUrlParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set("from", next.from);
          params.set("to", next.to);
          return params;
        },
        { replace: true },
      );
    },
    [setUrlParams],
  );

  const valid = isValidReportRange(range);

  return { range, setRange, valid, skip: !valid };
}
