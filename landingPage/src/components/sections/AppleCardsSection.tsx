import React from "react";
import { motion } from "framer-motion";
import { Carousel, Card } from "@/components/ui/apple-cards-carousel";

export function AppleCardsSection() {
  const cards = data.map((card, index) => (
    <Card key={card.src} card={card} index={index} />
  ));

  return (
    <section className="py-20 px-8 md:px-16 lg:px-24 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Khám phá tính năng
          </h2>
          <p className="text-lg text-gray-600">
            Trải nghiệm công nghệ hiện đại trong từng chi tiết
          </p>
        </motion.div>

        <Carousel items={cards} autoPlay={true} autoPlayInterval={3000} />

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-16 max-w-7xl mx-auto"
        >
          {[
            { number: "99.9%", label: "Độ tin cậy" },
            { number: "24/7", label: "Hỗ trợ" },
            { number: "< 1s", label: "Thời gian phản hồi" },
          ].map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 bg-white rounded-2xl border border-gray-200 shadow-md"
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {stat.number}
              </div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const DummyContent = () => {
  return (
    <>
      {[...new Array(3).fill(1)].map((_, index) => {
        return (
          <div
            key={"dummy-content" + index}
            className="bg-[#F5F5F7] dark:bg-neutral-800 p-8 md:p-14 rounded-3xl mb-4"
          >
            <p className="text-neutral-600 dark:text-neutral-400 text-base md:text-2xl font-sans max-w-3xl mx-auto">
              <span className="font-bold text-neutral-700 dark:text-neutral-200">
                Đây là nội dung chi tiết.
              </span>{" "}
              Giữ chỗ cho nội dung thực tế sẽ được thêm sau. Bạn có thể mô tả
              chi tiết về tính năng, lợi ích và cách sử dụng ở đây.
            </p>
            <img
              src="https://via.placeholder.com/800x400/4A90E2/FFFFFF?text=Detail+Image"
              alt="Feature detail"
              className="md:w-1/2 md:h-1/2 h-full w-full mx-auto object-contain mt-8"
            />
          </div>
        );
      })}
    </>
  );
};

const data = [
  {
    category: "Technology",
    title: "Smart Locker System",
    src: "https://via.placeholder.com/600x800/4A90E2/FFFFFF?text=Smart+Locker",
    content: <DummyContent />,
  },
  {
    category: "Mobile",
    title: "Mobile App Interface",
    src: "https://via.placeholder.com/600x800/E94B3C/FFFFFF?text=Mobile+App",
    content: <DummyContent />,
  },
  {
    category: "Security",
    title: "Security Features",
    src: "https://via.placeholder.com/600x800/6C5CE7/FFFFFF?text=Security",
    content: <DummyContent />,
  },
  {
    category: "Cloud",
    title: "Cloud Integration",
    src: "https://via.placeholder.com/600x800/00B894/FFFFFF?text=Cloud",
    content: <DummyContent />,
  },
  {
    category: "AI",
    title: "AI Analytics",
    src: "https://via.placeholder.com/600x800/FDCB6E/FFFFFF?text=AI+Analytics",
    content: <DummyContent />,
  },
  {
    category: "Dashboard",
    title: "Admin Dashboard",
    src: "https://via.placeholder.com/600x800/E17055/FFFFFF?text=Dashboard",
    content: <DummyContent />,
  },
];

export default AppleCardsSection;
