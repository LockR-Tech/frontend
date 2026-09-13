import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const TeamSection: React.FC = () => {
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

  const team = [
    {
      name: "Nguyễn Văn A",
      role: "CEO & Founder",
      bio: "10+ năm kinh nghiệm trong công nghệ IoT",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
      delay: 0,
    },
    {
      name: "Trần Thị B",
      role: "CTO",
      bio: "Chuyên gia về hệ thống phân tán",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
      delay: 200,
    },
    {
      name: "Lê Văn C",
      role: "Product Manager",
      bio: "Đam mê tạo ra trải nghiệm người dùng tuyệt vời",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
      delay: 400,
    },
    {
      name: "Phạm Thị D",
      role: "Lead Designer",
      bio: "Nghệ thuật và công nghệ hòa quyện",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
      delay: 600,
    },
  ];

  const values = [
    {
      icon: "🎯",
      title: "Sứ mệnh",
      description:
        "Mang đến giải pháp lưu trữ thông minh, an toàn và tiện lợi cho mọi người",
      delay: 0,
    },
    {
      icon: "👁️",
      title: "Tầm nhìn",
      description:
        "Trở thành nền tảng locker thông minh số 1 Việt Nam vào năm 2027",
      delay: 200,
    },
    {
      icon: "💎",
      title: "Giá trị cốt lõi",
      description:
        "Đổi mới không ngừng, lấy khách hàng làm trung tâm, minh bạch và tin cậy",
      delay: 400,
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="py-24 px-8 md:px-16 lg:px-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
        >
          <Badge className="mb-4 bg-gradient-to-r from-green-600 to-blue-600 text-white border-0">
            Đội ngũ của chúng tôi
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Gặp gỡ những người tạo nên Lock.R
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Đội ngũ đam mê công nghệ và cam kết mang đến trải nghiệm tốt nhất
          </p>
        </div>

        {/* Team members */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {team.map((member, index) => (
            <div
              key={index}
              className={`transition-all duration-1000 ${
                isVisible
                  ? "opacity-100 translate-y-0 rotate-0"
                  : "opacity-0 translate-y-20 -rotate-6"
              }`}
              style={{
                transitionDelay: `${member.delay}ms`,
              }}
            >
              <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 bg-white border border-neutral-200">
                <div className="p-6 relative z-10">
                  {/* Avatar with zoom effect */}
                  <div className="mb-6 flex justify-center">
                    <div className="relative">
                      <Avatar className="w-32 h-32 group-hover:scale-105 transition-transform duration-500 border-4 border-neutral-100 shadow-lg">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="text-2xl">
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-1 text-neutral-900">
                      {member.name}
                    </h3>
                    <p className="text-sm font-semibold mb-3 text-neutral-600">
                      {member.role}
                    </p>
                    <p className="text-sm text-neutral-600">{member.bio}</p>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Company values */}
        <div
          className={`transition-all duration-1000 delay-800 ${
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-20"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className={`transition-all duration-1000 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
                style={{
                  transitionDelay: `${800 + value.delay}ms`,
                }}
              >
                <Card className="p-8 text-center group hover:shadow-xl transition-all duration-500 border-0 bg-gradient-to-br from-white to-gray-50 hover:scale-105">
                  <div className="text-6xl mb-4 group-hover:scale-125 transition-transform duration-500">
                    {value.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-gray-900">
                    {value.title}
                  </h3>
                  <p className="text-gray-600">{value.description}</p>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          className={`mt-16 text-center transition-all duration-1000 delay-1000 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-lg text-gray-600 mb-6">
            Bạn muốn tham gia đội ngũ của chúng tôi?
          </p>
          <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300">
            Xem cơ hội nghề nghiệp
          </button>
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
