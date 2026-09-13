export default function LockrProcessSection() {
  return (
    <section className="py-xl bg-lockr-surface-container-lowest">
      <div className="max-w-container-max mx-auto px-gutter">
        <div className="text-center mb-xl">
          <h2 className="text-headline-lg text-lockr-primary mb-sm">
            Quy Trình Vận Hành
          </h2>
          <p className="text-body-lg text-lockr-on-surface-variant">
            Liền mạch từ lúc đặt hàng đến khi nhận hàng.
          </p>
        </div>

        <div className="relative">
          {/* Progress Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-1 bg-lockr-surface-variant rounded-full z-0">
            <div
              className="absolute top-0 left-0 h-full bg-lockr-primary rounded-full"
              style={{ width: "50%" }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-lg relative z-10">
            {/* Step 1 */}
            <div className="text-center flex flex-col items-center group">
              <div className="w-24 h-24 rounded-full bg-lockr-primary-fixed flex items-center justify-center mb-md border-4 border-lockr-surface-container-lowest group-hover:scale-110 transition-transform">
                <span
                  className="material-symbols-outlined text-lockr-primary text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  shopping_cart_checkout
                </span>
              </div>
              <h4 className="text-title-md text-lockr-on-surface mb-xs">
                Bước 1
              </h4>
              <p className="text-body-md text-lockr-on-surface-variant">
                Đặt hàng trực tuyến
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center flex flex-col items-center group">
              <div className="w-24 h-24 rounded-full bg-lockr-primary flex items-center justify-center mb-md border-4 border-lockr-surface-container-lowest shadow-md group-hover:scale-110 transition-transform">
                <span
                  className="material-symbols-outlined text-lockr-on-primary text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  rocket_launch
                </span>
              </div>
              <h4 className="text-title-md text-lockr-on-surface mb-xs">
                Bước 2
              </h4>
              <p className="text-body-md text-lockr-on-surface-variant">
                Drone tự động vận chuyển
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center flex flex-col items-center group">
              <div className="w-24 h-24 rounded-full bg-lockr-surface-container-high flex items-center justify-center mb-md border-4 border-lockr-surface-container-lowest group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-lockr-outline text-4xl">
                  lock
                </span>
              </div>
              <h4 className="text-title-md text-lockr-on-surface mb-xs">
                Bước 3
              </h4>
              <p className="text-body-md text-lockr-on-surface-variant">
                Lưu trữ an toàn tại Smart Locker
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center flex flex-col items-center group">
              <div className="w-24 h-24 rounded-full bg-lockr-surface-container-high flex items-center justify-center mb-md border-4 border-lockr-surface-container-lowest group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-lockr-outline text-4xl">
                  qr_code_scanner
                </span>
              </div>
              <h4 className="text-title-md text-lockr-on-surface mb-xs">
                Bước 4
              </h4>
              <p className="text-body-md text-lockr-on-surface-variant">
                Nhận hàng bằng mã QR/App
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
