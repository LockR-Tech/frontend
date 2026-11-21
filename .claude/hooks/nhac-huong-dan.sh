#!/usr/bin/env bash
# Nhắc luật "đổi giao diện ⇒ cập nhật hướng dẫn trên màn hình + HDSD" (F3-G13) trong phiên Claude Code.
# Luật: https://github.com/LockR-Tech/docs/blob/main/04-engineering/huong-dan-giao-dien.md
#
#   nhac-huong-dan.sh session   — SessionStart: đưa luật vào ngữ cảnh của Claude
#   nhac-huong-dan.sh edit      — PostToolUse Edit|Write|MultiEdit: sửa file giao diện ⇒ nhắc (Claude + người dùng)
#   nhac-huong-dan.sh stop      — Stop: còn file giao diện đổi mà hướng dẫn chưa đổi ⇒ nhắc người dùng
#
# Dùng chung cho repo frontend, mobile và thư mục làm việc chứa nhiều repo (G:\Lock.R). Không cần jq.
# Lỗi gì cũng thoát 0: hook chỉ nhắc, không chặn công việc.

mode="${1:-edit}"
RULE='LUẬT GIAO DIỆN ↔ HƯỚNG DẪN (F3-G13): thêm / xoá / sửa màn hình, nút, tab, hộp thoại, menu, bộ lọc hay nhãn ở web admin (frontend/fe), app (mobile) hoặc kiosk (iot/ui) thì PHẢI cập nhật hướng dẫn trong cùng đợt: (1) neo data-tour / TourAnchor; (2) nhóm + bước ở frontend/fe/public/onboarding/tours.json; (3) chữ vi + en ở locales/; (4) TĂNG version của nhóm đã sửa; (5) chụp lại ảnh HDSD (npm run hdsd:capture); (6) mobile: bash tool/sync_onboarding.sh; (7) npm test (fe) + flutter test test/onboarding xanh. Không ảnh hưởng hướng dẫn thì ghi lý do trong PR. Chi tiết: docs/04-engineering/huong-dan-giao-dien.md'

json_escape() { sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr '\n' ' '; }

# Đường dẫn tương đối trong repo ⇒ "ui" | "guide" | "" theo tên repo.
classify() {
  local repo="$1" rel="$2"
  case "$rel" in *.test.*|*_test.dart|*/test/*|test/*|*/tests/*|tests/*) echo ""; return ;; esac
  case "$repo" in
    frontend)
      case "$rel" in
        fe/public/onboarding/*|fe/scripts/hdsd/*) echo guide ;;
        fe/src/pages/*|fe/src/components/*|fe/src/layouts/*|fe/src/routes/*|fe/src/constants/sidebar.ts|fe/messages/vi.json|fe/messages/en.json) echo ui ;;
        *) echo "" ;;
      esac ;;
    mobile)
      case "$rel" in
        assets/onboarding/*) echo guide ;;
        lib/l10n/app_vi.arb|lib/l10n/app_en.arb|lib/core/routing/*|lib/core/presentation/*|lib/shared/widgets/*|lib/*/presentation/*|lib/*/*/presentation/*) echo ui ;;
        *) echo "" ;;
      esac ;;
    iot)
      case "$rel" in ui/src/*) echo ui ;; *) echo "" ;; esac ;;
    *) echo "" ;;
  esac
}

case "$mode" in
  session)
    printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$(printf '%s' "$RULE" | json_escape)"
    ;;

  edit)
    input="$(cat)"
    # "file_path":"G:\\Lock.R\\frontend\\fe\\src\\…" ⇒ G:/Lock.R/frontend/fe/src/…
    f="$(printf '%s' "$input" | tr -d '\n' | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | sed 's#\\\\#/#g')"
    [ -n "$f" ] || exit 0
    dir="$(dirname "$f")"
    root="$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)" || exit 0
    repo="$(basename "$root")"
    # git trả G:/…, file_path có thể là g:/… hoặc /g/… — chuẩn hoá cả hai trước khi cắt tiền tố.
    norm() { printf '%s' "$1" | sed -e 's#\\#/#g' -e 's#^/\([a-zA-Z]\)/#\1:/#' -e 's#^\([a-zA-Z]\):#\L\1:#'; }
    nf="$(norm "$f")"; nroot="$(norm "$root")"
    rel="${nf#"$nroot"/}"
    [ "$rel" != "$nf" ] || exit 0
    [ "$(classify "$repo" "$rel")" = "ui" ] || exit 0
    msg="Vừa sửa file giao diện $repo/$rel — nhớ cập nhật hướng dẫn trên màn hình + HDSD (neo, tours.json, chữ vi/en, tăng version, chụp lại ảnh) hoặc ghi lý do không ảnh hưởng trong PR."
    printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}\n' \
      "$(printf '%s' "$msg" | json_escape)" "$(printf '%s %s' "$msg" "$RULE" | json_escape)"
    ;;

  stop)
    base="${CLAUDE_PROJECT_DIR:-$PWD}"
    roots=()
    if git -C "$base" rev-parse --show-toplevel >/dev/null 2>&1; then
      roots+=("$(git -C "$base" rev-parse --show-toplevel)")
      sib="$(dirname "${roots[0]}")/frontend"   # mobile / iot: nội dung hướng dẫn nằm ở repo frontend cạnh bên
      [ -d "$sib/.git" ] && [ "$sib" != "${roots[0]}" ] && roots+=("$sib")
    else
      for r in frontend mobile iot; do [ -d "$base/$r/.git" ] && roots+=("$base/$r"); done
    fi
    ui=() guide=0
    for root in "${roots[@]}"; do
      repo="$(basename "$root")"
      while IFS= read -r line; do
        rel="${line:3}"; rel="${rel##* -> }"; rel="${rel%\"}"; rel="${rel#\"}"
        case "$(classify "$repo" "$rel")" in
          ui) ui+=("$repo/$rel") ;;
          guide) guide=1 ;;
        esac
      done < <(git -C "$root" status --porcelain 2>/dev/null)
    done
    [ "${#ui[@]}" -gt 0 ] && [ "$guide" -eq 0 ] || exit 0
    list="$(printf '%s, ' "${ui[@]:0:5}")"; list="${list%, }"
    [ "${#ui[@]}" -gt 5 ] && list="$list … (+$(( ${#ui[@]} - 5 )))"
    msg="⚠ Giao diện đã đổi (${list}) nhưng hướng dẫn trên màn hình / HDSD chưa đổi. Cập nhật tours.json + chữ vi/en + tăng version + chụp lại ảnh, hoặc ghi lý do không ảnh hưởng trong PR."
    printf '{"systemMessage":"%s"}\n' "$(printf '%s' "$msg" | json_escape)"
    ;;
esac
exit 0
