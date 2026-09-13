const testimonials = [
  {
    name: "Minh Tuấn",
    role: "Chủ cửa hàng thời trang",
    quote:
      "Từ khi dùng Lock.R, khách hàng nhận đơn nhanh hơn 50%, không còn tình trạng giao hàng thất lạc.",
  },
  {
    name: "Ngọc Hà",
    role: "Quản lý vận hành chuỗi cửa hàng",
    quote:
      "Hệ thống Smart Locker rất tiện, nhân viên giao nhận không cần chờ đợi, tiết kiệm chi phí vận hành rõ rệt.",
  },
  {
    name: "Hoàng Long",
    role: "Giám đốc Logistics",
    quote:
      "Drone giao hàng hoạt động ổn định, mạng lưới phủ rộng khắp khu vực trung tâm thành phố.",
  },
  {
    name: "Thùy Linh",
    role: "Chủ shop online",
    quote:
      "Ứng dụng dễ dùng, thông báo thời gian thực giúp mình quản lý đơn hàng dễ dàng hơn rất nhiều.",
  },
  {
    name: "Đức Anh",
    role: "Nhân viên văn phòng",
    quote:
      "Nhận hàng tại Locker gần công ty siêu tiện, không cần phải có mặt đúng giờ giao của shipper.",
  },
  {
    name: "Phương Mai",
    role: "Chủ tiệm cà phê",
    quote:
      "Dịch vụ chuyên nghiệp, bảo mật tốt, rất an tâm khi gửi hàng có giá trị cao.",
  },
];

export default function LockrTestimonialsSection() {
  return (
    <section className="py-xl bg-lockr-background">
      <div className="max-w-container-max mx-auto px-gutter">
        <div className="text-center mb-xl">
          <h2 className="text-headline-lg text-lockr-primary mb-sm">
            Khách Hàng Nói Gì Về Lock.R
          </h2>
          <p className="text-body-lg text-lockr-on-surface-variant max-w-2xl mx-auto mb-md">
            Hàng nghìn cá nhân và doanh nghiệp đã tin tưởng lựa chọn Lock.R.
          </p>

          <div className="inline-flex items-center gap-xs">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined text-lockr-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              ))}
            </div>
            <span className="text-title-md text-lockr-on-surface">
              4.9/5
            </span>
            <span className="text-body-md text-lockr-on-surface-variant">
              (1.200+ đánh giá)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="bg-lockr-surface-container-lowest rounded-xl p-lg lockr-ambient-shadow lockr-hover-lift flex flex-col"
            >
              <span
                className="material-symbols-outlined text-lockr-secondary text-4xl mb-md"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                format_quote
              </span>
              <p className="text-body-md text-lockr-on-surface-variant mb-lg flex-grow">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-sm">
                <div className="w-10 h-10 rounded-full bg-lockr-primary-container text-lockr-on-primary flex items-center justify-center text-label-md font-bold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="text-label-md text-lockr-on-surface font-bold">
                    {testimonial.name}
                  </div>
                  <div className="text-label-sm text-lockr-on-surface-variant">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
