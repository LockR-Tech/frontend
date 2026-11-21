#!/usr/bin/env bash
# CI: PR đổi giao diện thì phải cập nhật hướng dẫn trên màn hình + HDSD (F3-G13), hoặc tick
# "Không ảnh hưởng hướng dẫn — lý do: …" trong mô tả PR. Luật:
# https://github.com/LockR-Tech/docs/blob/main/04-engineering/huong-dan-giao-dien.md
# Đầu vào (env): BASE, HEAD (sha), BODY (mô tả PR), REPO = frontend | mobile.
set -euo pipefail

files="$(git diff --name-only "$BASE...$HEAD")"
ui=() guide=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  case "$REPO:$f" in
    *.test.*|*/tests/*|*_test.dart|mobile:test/*) continue ;;
  esac
  case "$REPO:$f" in
    frontend:fe/public/onboarding/*|frontend:fe/scripts/hdsd/*|mobile:assets/onboarding/*) guide=1 ;;
    frontend:fe/src/pages/*|frontend:fe/src/components/*|frontend:fe/src/layouts/*|frontend:fe/src/routes/*|\
    frontend:fe/src/constants/sidebar.ts|frontend:fe/messages/vi.json|frontend:fe/messages/en.json|\
    mobile:lib/l10n/app_vi.arb|mobile:lib/l10n/app_en.arb|mobile:lib/core/routing/*|mobile:lib/core/presentation/*|\
    mobile:lib/shared/widgets/*|mobile:lib/*/presentation/*) ui+=("$f") ;;
  esac
done <<< "$files"

# Mobile: thêm / bớt neo TourAnchor cũng là đã làm phần hướng dẫn (nội dung nằm ở repo frontend).
if [ "$REPO" = mobile ] && [ "$guide" -eq 0 ] && git diff -U0 "$BASE...$HEAD" -- lib | grep -qE '^[+-].*TourAnchor\('; then
  guide=1
fi

if [ "${#ui[@]}" -eq 0 ]; then
  echo "Không đổi file giao diện — không cần cập nhật hướng dẫn."
  exit 0
fi

echo "File giao diện đổi trong PR (${#ui[@]}):"
printf '  • %s\n' "${ui[@]}"

# Dòng tick trong mô tả PR (mẫu PR, mục "Hướng dẫn trên màn hình").
ticked() { printf '%s\n' "$BODY" | tr -d '\r' | grep -iE "^[[:space:]]*[-*][[:space:]]*\[[xX]\][[:space:]]*$1" | head -1; }
no_impact="$(ticked 'Không ảnh hưởng hướng dẫn' || true)"
reason="$(printf '%s' "$no_impact" | sed -E 's/.*Không ảnh hưởng hướng dẫn[^:]*:?//I' | sed -E 's/<!--.*-->//g' | tr -d '[:space:]')"
updated_elsewhere="$(ticked 'Đã cập nhật hướng dẫn' || true)"

if [ "$guide" -eq 1 ]; then
  echo "::notice title=Hướng dẫn trên màn hình::PR có cập nhật hướng dẫn. Nhớ TĂNG version nhóm đã sửa, đủ chữ vi + en, chụp lại ảnh HDSD (npm run hdsd:capture)."
  exit 0
fi
if [ -n "$no_impact" ] && [ -n "$reason" ]; then
  echo "::notice title=Hướng dẫn trên màn hình::Người mở PR xác nhận không ảnh hưởng hướng dẫn: $(printf '%s' "$no_impact" | sed -E 's/^[[:space:]]*[-*][[:space:]]*\[[xX]\][[:space:]]*//')"
  exit 0
fi
if [ "$REPO" = mobile ] && printf '%s' "$updated_elsewhere" | grep -qE 'github\.com/LockR-Tech/frontend/pull/[0-9]+'; then
  echo "::notice title=Hướng dẫn trên màn hình::Hướng dẫn cập nhật ở PR frontend: $(printf '%s' "$updated_elsewhere" | grep -oE 'github\.com/LockR-Tech/frontend/pull/[0-9]+')"
  exit 0
fi

where='fe/public/onboarding/ (tours.json, locales/vi.json, locales/en.json, hdsd/)'
[ "$REPO" = mobile ] && where='neo TourAnchor trong lib/ và nội dung ở repo frontend fe/public/onboarding/ (ghi link PR frontend)'
cat <<EOF
::error title=Chưa cập nhật hướng dẫn trên màn hình::PR đổi giao diện nhưng không cập nhật hướng dẫn (F3-G13). Cập nhật $where — hoặc tick "Không ảnh hưởng hướng dẫn — lý do: …" trong mô tả PR.

Luật: thêm / xoá / sửa màn hình, nút, tab, hộp thoại, menu, bộ lọc hay nhãn thì trong cùng đợt phải:
  1. gắn / sửa neo (web data-tour, app TourAnchor);
  2. khai nhóm + bước ở frontend fe/public/onboarding/tours.json;
  3. đủ chữ vi + en ở fe/public/onboarding/locales/;
  4. TĂNG version của nhóm đã sửa (người đã xem sẽ thấy "Có hướng dẫn mới");
  5. chụp lại ảnh HDSD: npm run hdsd:capture (repo frontend);
  6. mobile: bash tool/sync_onboarding.sh; npm test (fe) và flutter test test/onboarding xanh.
Không ảnh hưởng (vd. chỉ đổi màu, sửa lỗi bên trong không đổi nút / nhãn)? Sửa mô tả PR, tick dòng
"Không ảnh hưởng hướng dẫn — lý do: …" và ghi lý do — check này tự chạy lại khi sửa mô tả.
Chi tiết: https://github.com/LockR-Tech/docs/blob/main/04-engineering/huong-dan-giao-dien.md
EOF
exit 1
