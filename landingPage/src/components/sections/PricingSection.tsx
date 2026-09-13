import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const PricingSection: React.FC = () => {
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

  const plans = [
    {
      name: "Cơ bản",
      price: "Miễn phí",
      description: "Dành cho sinh viên mới bắt đầu",
      features: [
        "5 lần sử dụng/tháng",
        "Locker size nhỏ",
        "Thông báo cơ bản",
        "Hỗ trợ email",
      ],
      color: "from-gray-500 to-gray-600",
      popular: false,
      delay: 0,
    },
    {
      name: "Premium",
      price: "99,000đ",
      period: "/tháng",
      description: "Phổ biến nhất cho sinh viên",
      features: [
        "Không giới hạn sử dụng",
        "Tất cả size locker",
        "Thông báo realtime",
        "Hỗ trợ ưu tiên",
        "Đặt trước locker",
        "Quản lý nhiều locker",
      ],
      color: "from-blue-500 to-purple-600",
      popular: true,
      delay: 200,
    },
    {
      name: "Enterprise",
      price: "Liên hệ",
      description: "Dành cho tổ chức, trường học",
      features: [
        "Tất cả tính năng Premium",
        "Dashboard quản lý",
        "API tùy chỉnh",
        "Báo cáo chi tiết",
        "Tích hợp hệ thống",
        "Hỗ trợ 24/7",
        "Đào tạo chuyên sâu",
      ],
      color: "from-purple-500 to-pink-600",
      popular: false,
      delay: 400,
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="py-24 px-8 md:px-16 lg:px-24 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-20"
          }`}
        >
          <Badge className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
            Bảng giá
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Chọn gói phù hợp với bạn
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Linh hoạt, minh bạch và phù hợp với mọi nhu cầu
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`transition-all duration-1000 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-20"
              } ${plan.popular ? "md:scale-105" : ""}`}
              style={{
                transitionDelay: `${plan.delay}ms`,
              }}
            >
              <Card
                className={`relative overflow-hidden h-full group hover:shadow-2xl transition-all duration-500 ${
                  plan.popular
                    ? "border-2 border-blue-500"
                    : "border border-gray-200"
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
                      Phổ biến nhất
                    </Badge>
                  </div>
                )}

                {/* Gradient background on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                ></div>

                <div className="p-8 relative z-10">
                  {/* Plan name */}
                  <h3 className="text-2xl font-bold mb-2 text-gray-900">
                    {plan.name}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 mb-6">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-8">
                    <span
                      className={`text-5xl font-bold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}
                    >
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-600 text-lg">
                        {plan.period}
                      </span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 group/item"
                      >
                        <div
                          className={`mt-0.5 bg-gradient-to-r ${plan.color} rounded-full p-1 group-hover/item:scale-110 transition-transform duration-300`}
                        >
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-700 flex-1">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        : "bg-gray-900 hover:bg-gray-800"
                    } text-white group-hover:scale-105 transition-all duration-300`}
                  >
                    {plan.price === "Liên hệ" ? "Liên hệ ngay" : "Chọn gói này"}
                  </Button>
                </div>

                {/* Bottom accent line */}
                <div
                  className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${plan.color} w-0 group-hover:w-full transition-all duration-500`}
                ></div>
              </Card>
            </div>
          ))}
        </div>

        {/* Additional info */}
        <div
          className={`mt-16 text-center transition-all duration-1000 delay-600 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-gray-600 mb-4">
            Tất cả các gói đều bao gồm bảo mật SSL và sao lưu dữ liệu
          </p>
          <a
            href="#"
            className="text-blue-600 hover:text-purple-600 font-semibold transition-colors duration-300"
          >
            So sánh chi tiết các gói →
          </a>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
