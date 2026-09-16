// Chuẩn hoá query param cho các API báo cáo admin.
//
// Bộ lọc nhiều giá trị (`status`, `method`, `type`…) backend nhận `status=STORING,EXPIRED`.
// `fetchBaseQuery` đưa params qua `URLSearchParams`, mảng sẽ thành chuỗi nối bằng dấu phẩy
// — vẫn đúng, nhưng nối tường minh ở đây để hành vi không phụ thuộc chi tiết cài đặt.
// Giá trị rỗng (`undefined`, `null`, chuỗi rỗng, mảng rỗng) bị bỏ để URL không mang lọc thừa.

export type QueryParamValue =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly number[]
  | null
  | undefined;

export function toQueryParams(
  input: Record<string, QueryParamValue>,
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      params[key] = value.join(",");
      continue;
    }
    const text = String(value);
    if (text === "") continue;
    params[key] = text;
  }
  return params;
}
