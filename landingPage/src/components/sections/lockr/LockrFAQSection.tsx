import { useState } from "react";

const faqs = [
  {
    question: "Lock.R hoạt động như thế nào?",
    answer:
      "Lock.R kết hợp mạng lưới Smart Locker và đội Drone tự động để vận chuyển hàng hóa. Bạn đặt đơn qua ứng dụng, Drone sẽ giao hàng đến Locker gần nhất, sau đó bạn quét mã QR để nhận hàng.",
  },
  {
    question: "Khu vực nào đang được Lock.R hỗ trợ?",
    answer:
      "Hiện tại Lock.R đã triển khai tại các khu vực trung tâm, quanh các tòa nhà văn phòng và khu dân cư lớn ở TP. Hồ Chí Minh và Hà Nội, với kế hoạch mở rộng ra các thành phố khác trong năm tới.",
  },
  {
    question: "Drone giao hàng có an toàn không?",
    answer:
      "Tất cả Drone của Lock.R được vận hành tự động với hệ thống AI tránh va chạm, tuân thủ quy định bay của cơ quan quản lý hàng không, và được giám sát liên tục bởi trung tâm điều hành.",
  },
  {
    question: "Chi phí sử dụng dịch vụ là bao nhiêu?",
    answer:
      "Lock.R có gói Cá Nhân miễn phí với 3 lượt giao nhận mỗi tháng. Gói Doanh Nghiệp chỉ từ 499.000đ/tháng với giao nhận không giới hạn. Đối tác Logistics quy mô lớn vui lòng liên hệ để nhận báo giá tùy chỉnh.",
  },
  {
    question: "Làm sao để nhận hàng tại Smart Locker?",
    answer:
      "Bạn sẽ nhận được thông báo thời gian thực khi hàng đến Locker. Chỉ cần mở ứng dụng Lock.R, quét mã QR hoặc nhập mã PIN để mở khoang chứa hàng tương ứng.",
  },
  {
    question: "Nếu hàng hóa bị thất lạc hoặc hư hỏng thì sao?",
    answer:
      "Mọi đơn hàng vận chuyển qua Lock.R đều được bảo hiểm và theo dõi bằng camera giám sát 24/7. Trong trường hợp phát sinh sự cố, đội ngũ hỗ trợ sẽ xử lý và đền bù theo chính sách trong vòng 24 giờ.",
  },
];

export default function LockrFAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-xl bg-lockr-background">
      <div className="max-w-3xl mx-auto px-gutter">
        <div className="text-center mb-xl">
          <h2 className="text-headline-lg text-lockr-primary mb-sm">
            Câu Hỏi Thường Gặp
          </h2>
          <p className="text-body-lg text-lockr-on-surface-variant">
            Giải đáp những thắc mắc phổ biến về Lock.R.
          </p>
        </div>

        <div className="space-y-sm">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="bg-lockr-surface-container-lowest rounded-xl lockr-ambient-shadow"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between gap-md text-left px-lg py-md"
                  aria-expanded={isOpen}
                >
                  <span className="text-title-md text-lockr-on-surface">
                    {faq.question}
                  </span>
                  <span
                    className={`material-symbols-outlined text-lockr-primary transition-transform shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                {isOpen && (
                  <div className="px-lg pb-md">
                    <p className="text-body-md text-lockr-on-surface-variant">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
