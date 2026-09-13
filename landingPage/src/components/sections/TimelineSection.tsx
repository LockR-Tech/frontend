import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";

const TimelineSection: React.FC = () => {
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

  const timeline = [
    {
      year: "2024",
      title: "Khởi đầu",
      description: "Ý tưởng về hệ thống locker thông minh được hình thành",
    },
    {
      year: "2025",
      title: "Phát triển",
      description: "Ra mắt sản phẩm MVP tại 5 trường đại học đầu tiên",
    },
    {
      year: "2026",
      title: "Mở rộng",
      description: "Hiện tại: 50+ địa điểm, 10,000+ người dùng",
    },
    {
      year: "2027",
      title: "Tương lai",
      description: "Mục tiêu: Trở thành nền tảng locker số 1 Việt Nam",
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="py-32 px-8 md:px-16 lg:px-24 bg-neutral-50"
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
          <h2 className="text-5xl md:text-7xl font-semibold text-neutral-900 mb-6 tracking-tight">
            Hành trình của chúng tôi
          </h2>
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
            Từ ý tưởng đến hiện thực, chúng tôi không ngừng đổi mới
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-neutral-200"></div>

          <div className="space-y-16">
            {timeline.map((item, index) => (
              <div
                key={index}
                className={`relative transition-all duration-1000 ${
                  isVisible
                    ? "opacity-100 translate-x-0"
                    : index % 2 === 0
                      ? "opacity-0 -translate-x-20"
                      : "opacity-0 translate-x-20"
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div
                  className={`flex flex-col md:flex-row items-center gap-8 ${
                    index % 2 === 0 ? "md:flex-row-reverse" : ""
                  }`}
                >
                  {/* Content Card */}
                  <div className="flex-1 md:w-1/2">
                    <Card className="p-8 bg-white border border-neutral-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                      <div className="inline-block px-4 py-2 rounded-full bg-neutral-900 text-white font-bold text-lg mb-4">
                        {item.year}
                      </div>
                      <h3 className="text-2xl font-semibold text-neutral-900 mb-3">
                        {item.title}
                      </h3>
                      <p className="text-neutral-600 leading-relaxed">
                        {item.description}
                      </p>
                    </Card>
                  </div>

                  {/* Center Dot */}
                  <div className="absolute left-8 md:left-1/2 -translate-x-1/2">
                    <div className="w-6 h-6 rounded-full bg-neutral-900 border-4 border-white shadow-lg"></div>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1 md:w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
