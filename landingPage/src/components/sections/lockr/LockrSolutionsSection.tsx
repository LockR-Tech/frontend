export default function LockrSolutionsSection() {
  return (
    <section className="py-xl bg-lockr-background">
      <div className="max-w-container-max mx-auto px-gutter">
        <div className="text-center mb-xl">
          <h2 className="text-headline-lg text-lockr-primary mb-sm">
            Giải Pháp Toàn Diện
          </h2>
          <p className="text-body-lg text-lockr-on-surface-variant max-w-2xl mx-auto">
            Sự kết hợp hoàn hảo giữa hạ tầng vật lý an toàn và công nghệ vận
            chuyển hiện đại.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          {/* Solution 1: Smart Lockers */}
          <div className="bg-lockr-surface-container-lowest rounded-xl p-0 lockr-ambient-shadow overflow-hidden flex flex-col lockr-hover-lift">
            <div className="h-64 overflow-hidden relative">
              <img
                alt="Hệ thống tủ khóa thông minh hiện đại tại sảnh tòa nhà, một người đang quét mã QR trên màn hình tủ khóa bằng điện thoại."
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDoFa0dCMXLQr-w_apPRrw57OFbWdsLtpvXQ1eMRrf5f-gcPsc_YNPTF9kTeAgmfNmzyZ6VMWY8dGUC-I40Ko2dRNIvAwZ2AeW7nioYPquDfme71LZ-d6ZRMAC-Sb8k3MUY9WHnM7_gfeMesFZC-oXR8w28sK1e4VFmnDiEZQzF5wfN4_RvXfTKxCwfWYZRxfpwbKicxdUbG12BYzHULxH8kQw6ZpVxIlvhw-WIhVihRNQJfj0_t8A7YVnHtzNAwQ2ORRQyy4mpbLA-"
              />
            </div>
            <div className="p-lg flex-grow flex flex-col">
              <h3 className="text-title-md text-lockr-primary mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined text-lockr-secondary">
                  inventory_2
                </span>
                Hệ Thống Tủ Khóa Thông Minh
              </h3>
              <p className="text-body-md text-lockr-on-surface-variant mb-md flex-grow">
                An ninh 24/7 với hệ thống camera giám sát và khóa điện tử đa
                lớp. Nhận hàng không chạm nhanh chóng qua ứng dụng di động.
                Thông báo thông minh tự động khi hàng hóa cập bến an toàn.
              </p>
              <ul className="space-y-sm text-label-md text-lockr-on-surface-variant">
                <li className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-lockr-primary text-sm">
                    check_circle
                  </span>
                  Bảo mật đa lớp 24/7
                </li>
                <li className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-lockr-primary text-sm">
                    check_circle
                  </span>
                  Nhận hàng không chạm
                </li>
                <li className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-lockr-primary text-sm">
                    check_circle
                  </span>
                  Thông báo thời gian thực
                </li>
              </ul>
            </div>
          </div>

          {/* Solution 2: Drone Delivery */}
          <div className="bg-lockr-surface-container-lowest rounded-xl p-0 lockr-ambient-shadow overflow-hidden flex flex-col lockr-hover-lift">
            <div className="h-64 overflow-hidden relative bg-lockr-surface-container-low flex items-center justify-center">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-lockr-primary-container via-lockr-surface-container-lowest to-lockr-surface-container-lowest" />
              <img
                alt="Drone giao hàng tương lai bay trên thành phố hiện đại lúc chạng vạng, mang theo một thùng hàng trong khoang chứa."
                className="w-full h-full object-cover mix-blend-overlay"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxeo2dI0IKK6DZZT0fhAJ4ZnGVav4jQeIFrBhybxweeXHSUWKwXXkcfj47iBcI6nwisIYmlA-a3INgZiriVJas4jtMeTQDUmJDsrF5oy8MUXTjR2lkVPzoAFZIrVPBmjdU0iQpFCDyup9rZnSRpeQE8SvJtrIF6DE3oqljsHqrs4A5KGDOHE3tu-tHWginmHTBVfU2vvjedZpum3odnaP3CDiUnzI5lRN_np6ZX0MQQ_82V0BYsNKfV5qCmfnL1pnKfvd5RjazHzE6"
              />
            </div>
            <div className="p-lg flex-grow flex flex-col">
              <h3 className="text-title-md text-lockr-primary mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined text-lockr-secondary">
                  flight_takeoff
                </span>
                Giao Hàng Bằng Drone Siêu Tốc
              </h3>
              <p className="text-body-md text-lockr-on-surface-variant mb-md flex-grow">
                Tự động hóa đường bay với AI tối ưu hóa lộ trình. Giao hàng
                trực tiếp từ kho đến Tủ Khóa Thông Minh trong thời gian kỷ
                lục. Giải pháp xanh, giảm thiểu lượng khí thải carbon cho môi
                trường đô thị.
              </p>
              <ul className="space-y-sm text-label-md text-lockr-on-surface-variant">
                <li className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-lockr-primary text-sm">
                    check_circle
                  </span>
                  Đường bay tự động hóa AI
                </li>
                <li className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-lockr-primary text-sm">
                    check_circle
                  </span>
                  Giao trực tiếp đến Locker
                </li>
                <li className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-lockr-primary text-sm">
                    check_circle
                  </span>
                  Giảm thiểu carbon (Eco-friendly)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
