// Chụp ảnh HDSD cho nhóm kiosk (màn hình cảm ứng tại tủ, repo iot ui/). Kiosk không gắn neo trong mã: phần tử được
// tìm theo scripts/hdsd/kiosk-anchors.json (neo → CSS selector). Chưa có nhóm kiosk thì không làm gì.
export async function captureKiosk(browser, groups) {
  if (!groups.length) return;
  console.warn(`  ! ${groups.length} nhóm kiosk chưa có cách chụp (scripts/hdsd/kiosk.mjs)`);
}
