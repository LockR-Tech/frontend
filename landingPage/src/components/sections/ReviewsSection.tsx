import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const ReviewsSection: React.FC = () => {
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

  const reviews = [
    {
      name: "Minh Anh",
      role: "Sinh viên năm 3",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Minh",
      rating: 5,
      comment:
        "Siêu tiện lợi! Không còn lo lắng về việc giữ đồ khi đi học. Ứng dụng rất dễ sử dụng.",
    },
    {
      name: "Tuấn Kiệt",
      role: "Nhân viên văn phòng",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tuan",
      rating: 5,
      comment:
        "Đã sử dụng Lock.R được 6 tháng, chưa lần nào gặp vấn đề. Rất tin cậy!",
    },
    {
      name: "Thu Hà",
      role: "Giảng viên",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ha",
      rating: 5,
      comment:
        "Hệ thống bảo mật tốt, giao diện thân thiện. Giá cả hợp lý cho sinh viên.",
    },
    {
      name: "Đức Anh",
      role: "Freelancer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Duc",
      rating: 5,
      comment:
        "Tuyệt vời cho người hay di chuyển như mình. Có locker ở khắp nơi!",
    },
    {
      name: "Phương Linh",
      role: "Designer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Linh",
      rating: 5,
      comment:
        "UI/UX của app rất đẹp và trực quan. Thích nhất là tính năng theo dõi realtime.",
    },
    {
      name: "Hoàng Nam",
      role: "Developer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nam",
      rating: 5,
      comment:
        "API integration rất tốt. Đội ngũ support nhiệt tình và chuyên nghiệp.",
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
            Khách hàng nói gì
          </h2>
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
            Hàng ngàn người dùng hài lòng với dịch vụ của chúng tôi
          </p>

          {/* Overall Rating */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="w-8 h-8 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            <div className="text-3xl font-bold text-neutral-900">4.9/5</div>
            <div className="text-neutral-600">(2,847 đánh giá)</div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <Card
              key={index}
              className={`p-8 border-0 bg-white hover:shadow-2xl transition-all duration-500 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-20"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(review.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              {/* Comment */}
              <p className="text-neutral-700 leading-relaxed mb-8">
                "{review.comment}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={review.avatar} alt={review.name} />
                  <AvatarFallback>{review.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-neutral-900">
                    {review.name}
                  </div>
                  <div className="text-sm text-neutral-500">{review.role}</div>
                </div>
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
            Bạn cũng muốn chia sẻ trải nghiệm?
          </p>
          <button className="px-8 py-4 bg-neutral-900 text-white rounded-full font-semibold hover:bg-neutral-800 transition-all duration-300 hover:scale-105">
            Viết đánh giá
          </button>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
