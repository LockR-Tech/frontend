import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";

const ProcessSection: React.FC = () => {
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

  const steps = [
    {
      number: "01",
      title: "Tải ứng dụng",
      description: "Download Lock.R từ App Store hoặc Google Play",
      icon: "📱",
    },
    {
      number: "02",
      title: "Đăng ký tài khoản",
      description: "Tạo tài khoản nhanh chóng với email hoặc số điện thoại",
      icon: "✍️",
    },
    {
      number: "03",
      title: "Tìm locker gần bạn",
      description: "Sử dụng bản đồ để tìm locker phù hợp",
      icon: "📍",
    },
    {
      number: "04",
      title: "Đặt locker",
      description: "Chọn size và thời gian sử dụng",
      icon: "🎯",
    },
    {
      number: "05",
      title: "Quét QR",
      description: "Quét mã QR trên locker để mở khóa",
      icon: "📸",
    },
    {
      number: "06",
      title: "Sử dụng",
      description: "Cất giữ đồ an toàn và yên tâm",
      icon: "✨",
    },
  ];

  return (
    <section ref={sectionRef} className="py-32 px-8 md:px-16 lg:px-24 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div
          className={`text-center mb-20 transition-all duration-1000 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-10"
          }`}
        >
          <h2 className="text-5xl md:text-7xl font-semibold text-neutral-900 mb-6 tracking-tight">
            Đơn giản & Nhanh chóng
          </h2>
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
            Chỉ 6 bước để bắt đầu sử dụng Lock.R
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card
              key={index}
              className={`relative p-8 border-0 bg-neutral-50 hover:bg-white hover:shadow-2xl transition-all duration-500 overflow-hidden group ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-20"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Number Background */}
              <div className="absolute -top-4 -right-4 text-9xl font-bold text-neutral-200 group-hover:text-neutral-300 transition-colors opacity-20">
                {step.number}
              </div>

              {/* Content */}
              <div className="relative z-10">
                <div className="text-6xl mb-6">{step.icon}</div>
                <div className="text-4xl font-bold text-neutral-300 mb-4">
                  {step.number}
                </div>
                <h3 className="text-2xl font-semibold text-neutral-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-neutral-600 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Hover Effect Line */}
              <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 w-0 group-hover:w-full transition-all duration-500"></div>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div
          className={`text-center mt-20 transition-all duration-1000 delay-600 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <button className="px-12 py-5 bg-neutral-900 text-white text-lg rounded-full font-semibold hover:bg-neutral-800 transition-all duration-300 hover:scale-105 shadow-lg">
            Bắt đầu ngay
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
