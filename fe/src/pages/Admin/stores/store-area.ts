/**
 * Khu vực (quận/huyện/TP thuộc tỉnh) của một địa điểm, tách từ địa chỉ tự do của store-service
 * (không có cột tỉnh/quận riêng). Địa chỉ VN ghi từ nhỏ tới lớn, ngăn bằng dấu phẩy:
 *   "720A Điện Biên Phủ, P. 22, Bình Thạnh"            → "Bình Thạnh"
 *   "Nguyễn Xiển, Long Thạnh Mỹ, TP. Thủ Đức, TP.HCM"   → "TP. Thủ Đức" (bỏ đoạn tỉnh/thành ở cuối)
 *   "72 Lê Thánh Tôn, P. Bến Nghé, Q.1"                → "Quận 1"
 * Không tách được (địa chỉ trống / chỉ một đoạn) ⇒ null.
 */

/** Đoạn cuối là tỉnh/thành phố trực thuộc trung ương ⇒ khu vực là đoạn trước nó. */
const PROVINCE =
  /^(tp\.?\s*)?(hcm|hồ chí minh|ho chi minh|hà nội|ha noi|đà nẵng|da nang|hải phòng|hai phong|cần thơ|can tho)$|^(thành phố|tỉnh)\s/i;
const COUNTRY = /^(việt nam|viet nam|vn)$/i;

function normalize(part: string): string {
  const quan = /^q\.?\s*(\d+)$/i.exec(part);
  if (quan) return `Quận ${quan[1]}`;
  return part.replace(/\s+/g, " ");
}

export function areaOf(address: string | null | undefined): string | null {
  const parts = (address ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  while (parts.length > 0 && COUNTRY.test(parts[parts.length - 1])) parts.pop();
  if (parts.length > 1 && PROVINCE.test(parts[parts.length - 1])) parts.pop();
  if (parts.length < 2) return null;
  return normalize(parts[parts.length - 1]);
}
