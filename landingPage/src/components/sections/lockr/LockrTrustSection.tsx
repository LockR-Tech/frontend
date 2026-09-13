export default function LockrTrustSection() {
  return (
    <section className="py-xl bg-lockr-primary text-lockr-on-primary">
      <div className="max-w-container-max mx-auto px-gutter">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg text-center">
          <div className="p-md">
            <span
              className="material-symbols-outlined text-5xl text-lockr-secondary-fixed mb-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield_locked
            </span>
            <h3 className="text-title-md mb-xs">
              Công nghệ bảo mật hàng đầu
            </h3>
            <p className="text-body-md text-lockr-primary-fixed-dim">
              Mã hóa đầu cuối và giám sát an ninh liên tục.
            </p>
          </div>

          <div className="p-md border-t md:border-t-0 md:border-l border-lockr-primary-fixed-dim/30">
            <span
              className="material-symbols-outlined text-5xl text-lockr-secondary-fixed mb-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              map
            </span>
            <h3 className="text-title-md mb-xs">Mạng lưới drone phủ rộng</h3>
            <p className="text-body-md text-lockr-primary-fixed-dim">
              Kết nối mọi điểm nghẽn đô thị một cách hiệu quả.
            </p>
          </div>

          <div className="p-md border-t md:border-t-0 md:border-l border-lockr-primary-fixed-dim/30">
            <span
              className="material-symbols-outlined text-5xl text-lockr-secondary-fixed mb-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              timer
            </span>
            <h3 className="text-title-md mb-xs">Tiết kiệm 50% thời gian</h3>
            <p className="text-body-md text-lockr-primary-fixed-dim">
              Vượt qua giao thông mặt đất, giao hàng chớp nhoáng.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
