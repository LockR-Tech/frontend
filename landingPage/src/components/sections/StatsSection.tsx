import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const StatsSection: React.FC = () => {
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

  const stats = [
    {
      number: "10,000+",
      label: "Người dùng",
      description: "Tin tưởng và sử dụng hệ thống",
      delay: 0,
    },
    {
      number: "50+",
      label: "Địa điểm",
      description: "Khắp các trường đại học",
      delay: 200,
    },
    {
      number: "99.9%",
      label: "Uptime",
      description: "Hệ thống luôn sẵn sàng",
      delay: 400,
    },
    {
      number: "24/7",
      label: "Hỗ trợ",
      description: "Chăm sóc khách hàng",
      delay: 600,
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="py-24 px-8 md:px-16 lg:px-24 bg-white relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header with slide-in effect */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-10"
          }`}
        >
          <h2 className="text-5xl md:text-7xl font-semibold mb-6 text-neutral-900 tracking-tight">
            Được tin tưởng bởi hàng ngàn người dùng
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Những con số chứng minh chất lượng và sự tin cậy của chúng tôi
          </p>
        </div>

        {/* Stats cards with staggered animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`transition-all duration-1000 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-20"
              }`}
              style={{
                transitionDelay: `${stat.delay}ms`,
              }}
            >
              <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 bg-neutral-50 border border-neutral-200">
                <div className="p-8 relative z-10">
                  {/* Number with scale animation on hover */}
                  <div className="text-5xl md:text-6xl font-semibold mb-3 text-neutral-900 group-hover:scale-105 transition-transform duration-500">
                    {stat.number}
                  </div>

                  {/* Label */}
                  <h3 className="text-2xl font-semibold mb-2 text-neutral-900">
                    {stat.label}
                  </h3>

                  {/* Description */}
                  <p className="text-neutral-600">{stat.description}</p>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Additional info with fade-in */}
        <div
          className={`mt-16 text-center transition-all duration-1000 delay-800 ${
            isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          <p className="text-lg text-neutral-600 mb-6">
            Tham gia cùng hàng ngàn người dùng đã tin tưởng Lock.R
          </p>
          <button className="px-8 py-4 bg-neutral-900 text-white rounded-full font-semibold hover:bg-neutral-800 hover:scale-105 transition-all duration-300">
            Bắt đầu ngay hôm nay
          </button>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
