import React, { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const faqs = [
    {
      question: "Lock.R hoạt động như thế nào?",
      answer:
        "Lock.R là hệ thống locker thông minh cho phép bạn đặt, mở khóa và quản lý tủ đồ qua ứng dụng di động. Chỉ cần quét QR code hoặc nhập mã PIN để truy cập.",
    },
    {
      question: "Tôi có thể sử dụng Lock.R ở đâu?",
      answer:
        "Hiện tại Lock.R có mặt tại hơn 50 địa điểm bao gồm các trường đại học, trung tâm thương mại và khu công nghiệp trên toàn quốc.",
    },
    {
      question: "Chi phí sử dụng là bao nhiêu?",
      answer:
        "Chúng tôi có gói miễn phí cho 5 lần sử dụng/tháng. Gói Premium chỉ 99,000đ/tháng với không giới hạn sử dụng và nhiều tính năng cao cấp.",
    },
    {
      question: "Lock.R có an toàn không?",
      answer:
        "Tuyệt đối an toàn! Chúng tôi sử dụng mã hóa AES-256 bit, xác thực sinh trắc học và công nghệ blockchain để đảm bảo tài sản của bạn được bảo vệ tối đa.",
    },
    {
      question: "Nếu quên mật khẩu thì làm sao?",
      answer:
        "Bạn có thể dễ dàng đặt lại mật khẩu qua email hoặc số điện thoại đã đăng ký. Ngoài ra, bạn có thể sử dụng xác thực sinh trắc học (vân tay/khuôn mặt) để truy cập.",
    },
    {
      question: "Tôi có thể hủy đăng ký bất cứ lúc nào không?",
      answer:
        "Có, bạn hoàn toàn có thể hủy đăng ký bất cứ lúc nào mà không mất phí. Không có hợp đồng ràng buộc dài hạn.",
    },
  ];

  return (
    <section ref={sectionRef} className="py-32 px-8 md:px-16 lg:px-24 bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-10"
          }`}
        >
          <h2 className="text-5xl md:text-7xl font-semibold text-neutral-900 mb-6 tracking-tight">
            Câu hỏi thường gặp
          </h2>
          <p className="text-xl text-neutral-600">
            Tìm câu trả lời cho những thắc mắc phổ biến nhất
          </p>
        </div>

        {/* Accordion */}
        <div
          className={`transition-all duration-1000 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-neutral-200 rounded-2xl px-6 bg-neutral-50 hover:bg-neutral-100 transition-colors duration-300"
              >
                <AccordionTrigger className="text-left text-lg font-semibold text-neutral-900 hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-neutral-600 pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* CTA */}
        <div
          className={`text-center mt-16 transition-all duration-1000 delay-600 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-neutral-600 mb-6">Vẫn còn thắc mắc?</p>
          <button className="px-8 py-4 bg-neutral-900 text-white rounded-full font-semibold hover:bg-neutral-800 transition-all duration-300 hover:scale-105">
            Liên hệ hỗ trợ
          </button>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
