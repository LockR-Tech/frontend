import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { FiStar } from "react-icons/fi";
import { Card, CardContent } from "@/components/ui/card";

interface Feedback {
  id: number;
  name: string;
  role: string;
  content: string;
  rating: number;
  image: string;
}

const feedbacks: Feedback[] = [
  {
    id: 1,
    name: "Nguyễn Văn A",
    role: "Chủ tiệm giặt ủi",
    content:
      "Hệ thống Lock.R giúp tôi quản lý quần áo khách hàng hiệu quả hơn rất nhiều. Khách hàng cũng rất hài lòng với dịch vụ tự động này.",
    rating: 5,
    image: "https://via.placeholder.com/400x300/4A90E2/FFFFFF?text=Feedback+1",
  },
  {
    id: 2,
    name: "Trần Thị B",
    role: "Sinh viên",
    content:
      "Siêu tiện lợi! Không cần lo lắng về giờ giấc, có thể lấy quần áo bất cứ lúc nào. Ứng dụng di động rất dễ sử dụng.",
    rating: 5,
    image: "https://via.placeholder.com/400x250/E94B3C/FFFFFF?text=Feedback+2",
  },
  {
    id: 3,
    name: "Lê Minh C",
    role: "Nhân viên văn phòng",
    content:
      "An toàn và bảo mật cao. Tôi yên tâm gửi đồ ở đây mà không lo bị thất lạc hay nhầm lẫn.",
    rating: 5,
    image: "https://via.placeholder.com/400x350/6C5CE7/FFFFFF?text=Feedback+3",
  },
  {
    id: 4,
    name: "Phạm Thu D",
    role: "Chủ khách sạn",
    content:
      "Tích hợp vào hệ thống khách sạn rất mượt mà. Khách quốc tế rất thích dịch vụ này.",
    rating: 5,
    image: "https://via.placeholder.com/400x280/00B894/FFFFFF?text=Feedback+4",
  },
  {
    id: 5,
    name: "Hoàng Văn E",
    role: "Gym Owner",
    content:
      "Giải pháp hoàn hảo cho phòng tập. Thành viên có thể gửi đồ tập an toàn và tiện lợi.",
    rating: 5,
    image: "https://via.placeholder.com/400x320/FDCB6E/FFFFFF?text=Feedback+5",
  },
  {
    id: 6,
    name: "Võ Thị F",
    role: "Quản lý chung cư",
    content:
      "Dịch vụ tuyệt vời cho cư dân. Mọi người đều hài lòng với độ tiện lợi và chuyên nghiệp.",
    rating: 5,
    image: "https://via.placeholder.com/400x300/E17055/FFFFFF?text=Feedback+6",
  },
];

const FeedbackSection: React.FC = () => {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;

    const items = gridRef.current.querySelectorAll(".feedback-item");

    // GSAP Masonry-style animation
    gsap.fromTo(
      items,
      {
        opacity: 0,
        y: 60,
        scale: 0.8,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: {
          amount: 0.8,
          from: "random",
          grid: "auto",
        },
        ease: "power3.out",
      },
    );
  }, []);

  return (
    <section className="py-20 px-8 md:px-16 lg:px-24 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Khách hàng nói gì về chúng tôi
          </h2>
          <p className="text-lg text-gray-600">
            Hàng nghìn khách hàng tin tưởng và hài lòng
          </p>
        </motion.div>

        <div
          ref={gridRef}
          className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6"
        >
          {feedbacks.map((feedback) => (
            <Card
              key={feedback.id}
              className="feedback-item break-inside-avoid border-2 hover:shadow-2xl transition-all duration-300 hover:scale-105 mb-6"
            >
              <CardContent className="p-0">
                {/* Placeholder Image */}
                <div className="relative w-full overflow-hidden rounded-t-lg">
                  <img
                    src={feedback.image}
                    alt={feedback.name}
                    className="w-full h-auto object-cover"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">
                        {feedback.name}
                      </h4>
                      <p className="text-sm text-gray-500">{feedback.role}</p>
                    </div>
                  </div>

                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: feedback.rating }).map((_, i) => (
                      <FiStar
                        key={i}
                        className="text-yellow-400 fill-yellow-400"
                        size={16}
                      />
                    ))}
                  </div>

                  <p className="text-gray-700 leading-relaxed">
                    {feedback.content}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16"
        >
          {[
            { number: "10K+", label: "Khách hàng" },
            { number: "50+", label: "Địa điểm" },
            { number: "99.9%", label: "Uptime" },
            { number: "4.9/5", label: "Đánh giá" },
          ].map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-gray-200 shadow-md"
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {stat.number}
              </div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </motion.div> */}
      </div>
    </section>
  );
};

export default FeedbackSection;
