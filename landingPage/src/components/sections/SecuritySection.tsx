import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Shield, Lock, Eye, FileCheck } from "lucide-react";

const SecuritySection: React.FC = () => {
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

  const features = [
    {
      icon: Shield,
      title: "Mã hóa đầu cuối",
      description:
        "Tất cả dữ liệu được mã hóa AES-256 bit từ thiết bị đến server",
    },
    {
      icon: Lock,
      title: "Xác thực đa yếu tố",
      description: "Bảo vệ tài khoản với sinh trắc học, OTP và mật khẩu",
    },
    {
      icon: Eye,
      title: "Giám sát 24/7",
      description:
        "Hệ thống giám sát liên tục phát hiện và ngăn chặn mọi mối đe dọa",
    },
    {
      icon: FileCheck,
      title: "Tuân thủ tiêu chuẩn",
      description: "Đạt chứng nhận ISO 27001 và tuân thủ GDPR, PCI DSS",
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="py-32 px-8 md:px-16 lg:px-24 bg-neutral-900"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div
          className={`text-center mb-20 transition-all duration-1000 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-10"
          }`}
        >
          <h2 className="text-5xl md:text-7xl font-semibold text-white mb-6 tracking-tight">
            Bảo mật tuyệt đối
          </h2>
          <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
            An toàn của bạn là ưu tiên hàng đầu của chúng tôi
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {features.map((feature, index) => (
            <Card
              key={index}
              className={`p-10 bg-neutral-800 border-neutral-700 hover:bg-neutral-750 hover:shadow-2xl transition-all duration-500 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-20"
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="inline-flex p-4 rounded-2xl bg-neutral-800 border border-neutral-700 mb-6">
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">
                {feature.title}
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>

        {/* Certifications */}
        <div
          className={`text-center transition-all duration-1000 delay-600 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-neutral-500 mb-8">Chứng nhận & Tuân thủ</p>
          <div className="flex flex-wrap justify-center items-center gap-12">
            {["ISO 27001", "GDPR", "PCI DSS", "SOC 2"].map((cert, idx) => (
              <div
                key={idx}
                className="px-8 py-4 bg-neutral-800 rounded-xl border border-neutral-700 hover:border-neutral-600 transition-colors"
              >
                <span className="text-white font-semibold text-lg">{cert}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
