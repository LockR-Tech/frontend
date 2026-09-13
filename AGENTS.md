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

## Riêng repo này

- **Hai ứng dụng:** `fe/` = admin web (`admin.locker-drone.tech`, Worker `laundry-locker-frontend-1`); `landingPage/` = trang giới thiệu (`locker-drone.tech`, Worker `laundry-locker-landing`).
- **Deploy:** merge `main` có đổi `fe/**` hoặc `landingPage/**` ⇒ `deploy.yml` build + `wrangler deploy` (~2 phút). Rollback: `npx wrangler rollback --name <worker>`.
- **fe:** `npm ci` · `npm run dev` (:3000, proxy `/api` → **production**) · `npm run lint` · `npm run build`.
- API base: `VITE_API_BASE_URL`, mặc định `https://api.locker-drone.tech` (`fe/src/constants/api-paths.ts`). Muốn trỏ backend local: tạo `fe/.env` với `VITE_API_BASE_URL=http://localhost:18080` (file này gitignore).
- Backend có endpoint trả **mảng phẳng**, có endpoint trả **Page** (`.content`) — dùng `extractList` khi đọc danh sách.
- Enum trạng thái đơn trên web đang là bộ legacy giặt ủi (thiếu `STORING`, `EXPIRED`, `AWAITING_DISPATCH`) — xem gap F2-G08 trong docs trước khi sửa màn hình đơn hàng.
