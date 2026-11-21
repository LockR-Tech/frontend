# AGENTS.md — frontend

Repo này thuộc hệ thống **Lock.R** (org [LockR-Tech](https://github.com/LockR-Tech)). File này chỉ là **con trỏ** — tiến độ, luật và sơ đồ nằm ở repo [**docs**](https://github.com/LockR-Tech/docs). Không ghi tiến độ vào đây.

## Trước khi làm bất cứ việc gì

1. Repo docs phải nằm cạnh repo này (`../docs`). Chưa có: `git clone https://github.com/LockR-Tech/docs.git ../docs`. Có rồi: `git -C ../docs pull --ff-only`.
2. Đọc `../docs/AGENTS.md` — giao thức bắt đầu/kết thúc phiên.
3. Đọc `../docs/STATUS.md` — tiến độ, rủi ro, việc đang làm, việc tiếp theo.
4. Đọc file luồng liên quan trong `../docs/02-flows/`.

## Luật bắt buộc

- `main` = production. **Merge vào `main` là deploy thật.** Không push thẳng `main` — nhánh + PR + review + squash merge.
- Nhánh `<type>/<gap-id>-<mo-ta>`; commit và tiêu đề PR theo Conventional Commits; footer `Refs: F2-G01`.
- Không commit secret, `.env` thật, file build. Không thêm trailer `Co-Authored-By` của công cụ AI.
- Việc chỉ xong khi tài liệu ở `../docs` đã cập nhật (STATUS, file luồng, sơ đồ nếu đổi trạng thái).
- **Đổi giao diện ⇒ cập nhật hướng dẫn trên màn hình + HDSD trong cùng PR** ([luật](https://github.com/LockR-Tech/docs/blob/main/04-engineering/huong-dan-giao-dien.md), mục cuối file). Check CI "Hướng dẫn trên màn hình" chặn merge nếu quên.

## Riêng repo này

- **Hai ứng dụng:** `fe/` = admin web (`admin.locker-drone.tech`, Worker `laundry-locker-frontend-1`); `landingPage/` = trang giới thiệu (`locker-drone.tech`, Worker `laundry-locker-landing`).
- **Deploy:** merge `main` có đổi `fe/**` hoặc `landingPage/**` ⇒ `deploy.yml` build + `wrangler deploy` (~2 phút). Rollback: `npx wrangler rollback --name <worker>`.
- **fe:** `npm ci` · `npm run dev` (:3000, proxy `/api` → **production**) · `npm run lint` · `npm run build`.
- API base: `VITE_API_BASE_URL`, mặc định `https://api.locker-drone.tech` (`fe/src/constants/api-paths.ts`). Muốn trỏ backend local: tạo `fe/.env` với `VITE_API_BASE_URL=http://localhost:18080` (file này gitignore).
- Backend có endpoint trả **mảng phẳng**, có endpoint trả **Page** (`.content`) — dùng `extractList` khi đọc danh sách.
- Enum trạng thái đơn trên web đang là bộ legacy giặt ủi (thiếu `STORING`, `EXPIRED`, `AWAITING_DISPATCH`) — xem gap F2-G08 trong docs trước khi sửa màn hình đơn hàng.

## Hướng dẫn lần đầu trên màn hình (F3-G13) — LUẬT bắt buộc

Áp dụng cho mọi người và AI agent ([luật đầy đủ](https://github.com/LockR-Tech/docs/blob/main/04-engineering/huong-dan-giao-dien.md)). Bạn được nhắc ở mọi bước:

- **Claude Code**: `.claude/settings.json` (đã commit) có hook nhắc luật khi mở phiên, khi sửa file giao diện, và cuối lượt nếu giao diện đổi mà hướng dẫn chưa đổi.
- **Git**: `.githooks/pre-commit` nhắc khi commit file giao diện mà không kèm `fe/public/onboarding/`. Hook tự bật khi chạy `npm install` trong `fe/` (lệnh `git config core.hooksPath .githooks`).
- **PR**: mẫu PR có mục "Hướng dẫn trên màn hình". Check CI **"Hướng dẫn trên màn hình"** (`.github/workflows/huong-dan.yml`) **đỏ** nếu PR đổi giao diện (`fe/src/pages|components|layouts|routes`, `constants/sidebar.ts`, `fe/messages/{vi,en}.json`) mà không đổi `fe/public/onboarding/` và không tick "Không ảnh hưởng hướng dẫn — lý do: …". Sửa mô tả PR là check tự chạy lại.

Các bước phải làm:

Nội dung tour dùng chung cho web admin và app mobile nằm ở `fe/public/onboarding/` ([ADR-0011](https://github.com/LockR-Tech/docs/blob/main/adr/0011-huong-dan-lan-dau-tren-man-hinh.md)). **Thêm / xoá / sửa một màn hình hay một nút thì cập nhật hướng dẫn NGAY trong cùng PR:**

1. Gắn hoặc sửa neo: web `data-tour="<neo>"`, mobile `TourAnchor('<neo>')` (cùng mã khi là cùng phần tử).
2. Khai nhóm / bước trong `tours.json`: `platforms` (web / mobile / cả hai), `webRoute` / `mobileRoute` nếu phải mở trang trước, `placement`, `optional: true` nếu phần tử có thể không hiện, `openNav: true` nếu nằm trong menu ngăn kéo.
3. Đủ chữ ở `locales/vi.json` và `locales/en.json` (`groups.<nhóm>.title|summary`, `steps.<bước>.title|body`).
4. Đổi nội dung một nhóm ⇒ **TĂNG `version` của nhóm** để người đã xem nhận "Có hướng dẫn mới".
5. Chụp lại ảnh HDSD của nhóm (`npm run hdsd:capture`, chỉ chạy trên dev/demo).
6. `npm test` phải xanh: quét neo web + mobile, đủ chữ mọi ngôn ngữ, đủ ảnh HDSD. Có bước mobile ⇒ chạy `tool/sync_onboarding.sh` trong repo mobile để chép bản kèm theo app.
