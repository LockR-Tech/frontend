import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TechnologySection: React.FC = () => {
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

  const technologies = [
    {
      category: "Frontend",
      items: ["React", "TypeScript", "Tailwind CSS", "Next.js"],
      icon: "⚛️",
    },
    {
      category: "Backend",
      items: ["Node.js", "Express", "MongoDB", "Redis"],
      icon: "⚙️",
    },
    {
      category: "Mobile",
      items: ["React Native", "Swift", "Kotlin", "Flutter"],
      icon: "📱",
    },
    {
      category: "IoT & Hardware",
      items: ["Raspberry Pi", "Arduino", "MQTT", "WebSocket"],
      icon: "🔌",
    },
    {
      category: "Security",
      items: ["JWT", "OAuth 2.0", "AES-256", "Blockchain"],
      icon: "🔒",
    },
    {
      category: "Cloud & DevOps",
      items: ["AWS", "Docker", "Kubernetes", "CI/CD"],
      icon: "☁️",
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
            Công nghệ tiên tiến
          </h2>
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
            Được xây dựng với các công nghệ hàng đầu để đảm bảo hiệu suất và độ
            tin cậy
          </p>
        </div>

        {/* Technology Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {technologies.map((tech, index) => (
            <Card
              key={index}
              className={`p-8 border-0 bg-neutral-50 hover:bg-white hover:shadow-2xl transition-all duration-500 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-20"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className="text-6xl mb-6">{tech.icon}</div>

              {/* Category */}
              <h3 className="text-2xl font-semibold text-neutral-900 mb-4">
                {tech.category}
              </h3>

              {/* Tech Stack */}
              <div className="flex flex-wrap gap-2">
                {tech.items.map((item, idx) => (
                  <Badge
                    key={idx}
                    className="bg-neutral-900 text-white border-0 px-3 py-1 text-sm"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          className={`text-center mt-20 transition-all duration-1000 delay-600 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-neutral-600 mb-6">
            Muốn tìm hiểu thêm về kiến trúc kỹ thuật?
          </p>
          <button className="px-8 py-4 bg-neutral-900 text-white rounded-full font-semibold hover:bg-neutral-800 transition-all duration-300 hover:scale-105">
            Xem tài liệu kỹ thuật
          </button>
        </div>
      </div>
    </section>
  );
};

export default TechnologySection;
