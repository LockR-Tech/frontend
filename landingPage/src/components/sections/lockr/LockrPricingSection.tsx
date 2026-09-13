const plans = [
  {
    icon: "person",
    name: "Cá Nhân",
    price: "Miễn Phí",
    period: "",
    description: "Dành cho người dùng gửi nhận hàng không thường xuyên.",
    features: [
      "3 lượt giao nhận / tháng",
      "Truy cập mạng lưới Smart Locker",
      "Theo dõi đơn hàng thời gian thực",
      "Hỗ trợ qua email",
    ],
    cta: "Bắt Đầu Miễn Phí",
    popular: false,
  },
  {
    icon: "storefront",
    name: "Doanh Nghiệp",
    price: "499.000đ",
    period: "/tháng",
    description: "Tối ưu cho cửa hàng và doanh nghiệp giao hàng thường xuyên.",
    features: [
      "Giao nhận không giới hạn",
      "Ưu tiên đường bay Drone",
      "Đặt trước Locker theo lịch",
      "Dashboard quản lý & báo cáo",
      "Hỗ trợ ưu tiên 24/7",
    ],
    cta: "Chọn Gói Doanh Nghiệp",
    popular: true,
  },
  {
    icon: "handshake",
    name: "Đối Tác Logistics",
    price: "Liên Hệ",
    period: "",
    description: "Giải pháp tùy chỉnh cho đối tác vận chuyển quy mô lớn.",
    features: [
      "Tích hợp API vận chuyển",
      "Mạng lưới Locker riêng",
      "Đội Drone chuyên biệt",
      "SLA & hỗ trợ chuyên biệt",
      "Đào tạo & triển khai",
    ],
    cta: "Liên Hệ Tư Vấn",
    popular: false,
  },
];

export default function LockrPricingSection() {
  return (
    <section className="py-xl bg-lockr-surface-container-lowest">
      <div className="max-w-container-max mx-auto px-gutter">
        <div className="text-center mb-xl">
          <h2 className="text-headline-lg text-lockr-primary mb-sm">
            Bảng Giá Dịch Vụ
          </h2>
          <p className="text-body-lg text-lockr-on-surface-variant max-w-2xl mx-auto">
            Linh hoạt cho mọi quy mô, từ cá nhân đến đối tác vận chuyển lớn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl p-lg flex flex-col lockr-hover-lift ${
                plan.popular
                  ? "bg-lockr-primary text-lockr-on-primary lockr-ambient-shadow md:scale-105 z-10"
                  : "bg-lockr-background lockr-ambient-shadow"
              }`}
            >
              {plan.popular && (
                <span className="absolute top-0 right-0 bg-lockr-secondary-fixed text-lockr-on-secondary-fixed text-label-sm uppercase tracking-wide px-md py-1 rounded-tr-xl rounded-bl-xl">
                  Phổ Biến Nhất
                </span>
              )}

              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-md ${
                  plan.popular
                    ? "bg-lockr-on-primary/15"
                    : "bg-lockr-primary-fixed"
                }`}
              >
                <span
                  className={`material-symbols-outlined ${
                    plan.popular
                      ? "text-lockr-on-primary"
                      : "text-lockr-primary"
                  }`}
                >
                  {plan.icon}
                </span>
              </div>

              <h3 className="text-title-md mb-xs">{plan.name}</h3>
              <p
                className={`text-body-md mb-md ${
                  plan.popular
                    ? "text-lockr-on-primary/80"
                    : "text-lockr-on-surface-variant"
                }`}
              >
                {plan.description}
              </p>

              <div className="mb-md">
                <span className="text-headline-lg">{plan.price}</span>
                {plan.period && (
                  <span
                    className={`text-body-md ${
                      plan.popular
                        ? "text-lockr-on-primary/80"
                        : "text-lockr-on-surface-variant"
                    }`}
                  >
                    {plan.period}
                  </span>
                )}
              </div>

              <ul className="space-y-sm text-label-md mb-lg flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-xs">
                    <span
                      className={`material-symbols-outlined text-sm ${
                        plan.popular
                          ? "text-lockr-secondary-fixed"
                          : "text-lockr-primary"
                      }`}
                    >
                      check_circle
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-sm rounded-lg text-label-md transition-colors ${
                  plan.popular
                    ? "bg-lockr-on-primary text-lockr-primary hover:bg-lockr-secondary-fixed"
                    : "bg-lockr-primary-container text-lockr-on-primary hover:bg-lockr-primary"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
