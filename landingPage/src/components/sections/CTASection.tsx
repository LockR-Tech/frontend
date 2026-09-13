import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const CTASection: React.FC = () => {
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
      { threshold: 0.2 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    { icon: "⚡", text: "Thiết lập chỉ trong 5 phút" },
    { icon: "🔒", text: "Bảo mật tối đa" },
    { icon: "💰", text: "Dùng thử miễn phí" },
    { icon: "🎁", text: "Ưu đãi đặc biệt" },
  ];

  return (
    <section
      ref={sectionRef}
      className="py-24 px-8 md:px-16 lg:px-24 relative overflow-hidden bg-black"
    >
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Main content with slide-up effect */}
        <div
          className={`text-center transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
          }`}
        >
          {/* Heading */}
          <h2
            className={`text-5xl md:text-7xl font-semibold mb-6 text-white transition-all duration-1000 delay-200 tracking-tight ${
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
            }`}
          >
            Sẵn sàng trải nghiệm
            <br />
            tương lai của Lock.R?
          </h2>

          {/* Description */}
          <p
            className={`text-xl md:text-2xl text-neutral-400 mb-12 max-w-3xl mx-auto transition-all duration-1000 delay-400 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
            Tham gia cùng hàng ngàn người dùng đang sử dụng Lock.R mỗi ngày.
          </p>

          {/* Email signup form */}
          <div
            className={`max-w-2xl mx-auto mb-12 transition-all duration-1000 delay-600 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                type="email"
                placeholder="Nhập email của bạn..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-full px-6 py-6 text-lg text-white placeholder:text-neutral-500 focus:border-neutral-500 transition-colors duration-300"
              />
              <Button className="bg-white text-black hover:bg-neutral-200 font-semibold px-8 py-6 rounded-full text-lg transition-all duration-300 hover:scale-105">
                Bắt đầu ngay
              </Button>
            </div>
          </div>

          {/* Features grid */}
          <div
            className={`grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 transition-all duration-1000 delay-800 ${
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
            }`}
          >
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:bg-neutral-800 transition-all duration-300 hover:scale-105"
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <p className="text-white font-semibold">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
