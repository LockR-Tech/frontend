import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const NewsletterSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-32 px-8 md:px-16 lg:px-24 bg-neutral-900"
    >
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          {/* Left Content */}
          <div
            className={`lg:col-span-2 transition-all duration-1000 ${
              isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-20"
            }`}
          >
            <h2 className="text-4xl md:text-5xl font-semibold text-white mb-6 tracking-tight">
              Cập nhật tin tức mới nhất
            </h2>
            <p className="text-lg text-neutral-400 leading-relaxed">
              Nhận thông tin về sản phẩm mới, ưu đãi đặc biệt và các mẹo sử dụng
              hữu ích.
            </p>
          </div>

          {/* Right Form */}
          <div
            className={`lg:col-span-3 transition-all duration-1000 delay-300 ${
              isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-20"
            }`}
          >
            <div className="bg-white rounded-3xl p-8">
              <div className="space-y-6">
                <div>
                  <Input
                    type="email"
                    placeholder="Nhập email của bạn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-6 py-6 text-lg border-neutral-300 rounded-2xl focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox id="terms" />
                  <label
                    htmlFor="terms"
                    className="text-sm text-neutral-600 leading-relaxed"
                  >
                    Tôi đồng ý nhận email marketing từ Lock.R
                  </label>
                </div>

                <Button className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-6 text-lg rounded-2xl transition-all duration-300 hover:scale-[1.02]">
                  Đăng ký ngay
                </Button>

                <p className="text-xs text-neutral-500 text-center">
                  Bạn có thể hủy đăng ký bất cứ lúc nào. Chúng tôi tôn trọng sự
                  riêng tư của bạn.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          className={`mt-20 grid grid-cols-3 gap-8 transition-all duration-1000 delay-600 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {[
            { value: "15K+", label: "Người đăng ký" },
            { value: "2x/tuần", label: "Tần suất gửi" },
            { value: "95%", label: "Tỷ lệ mở email" },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-neutral-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
