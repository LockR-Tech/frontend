import i18n from "~/utils/i18n";

/// Header backend đọc để dịch chữ server sang tiếng Anh (ADR-0010, `ServerText.LANGUAGE_HEADER`).
export const SERVER_LANGUAGE_HEADER = "X-App-Language";

/**
 * Màn admin tự soạn nội dung (tên/mô tả khuyến mãi, cửa hàng, mẫu thông báo, cài đặt, tài liệu trợ lý):
 * không xin bản dịch, để form sửa luôn thấy và lưu lại đúng chữ admin đã gõ — bản dịch lưu ngược vào DB
 * sẽ đổi nội dung cho mọi người dùng.
 */
const AUTHORED_CONTENT = [
  /^\/api\/admin\/promotions/,
  /^\/api\/admin\/stores/,
  /^\/api\/admin\/notifications\/templates/,
  /^\/api\/admin\/settings/,
  /^\/api\/settings/,
  /^\/api\/admin\/knowledge/,
  /^\/api\/admin\/services/,
];

function pathOf(url: string): string {
  try {
    return new URL(url, "http://local").pathname;
  } catch {
    return url;
  }
}

/// Giá trị header cho request tới `url`, hoặc null khi không cần (đang tiếng Việt / màn soạn nội dung).
export function serverLanguageFor(url: string): string | null {
  if (!i18n.language?.startsWith("en")) return null;
  const path = pathOf(url);
  return AUTHORED_CONTENT.some((re) => re.test(path)) ? null : "en";
}
