import React from "react";
import { motion } from "framer-motion";
import { Carousel, Card } from "@/components/ui/apple-cards-carousel";

export function AppleCardsShowcaseSection() {
  const cards = showcaseData.map((card, index) => (
    <Card key={card.src} card={card} index={index} />
  ));

  return (
    <section className="py-20 px-8 md:px-16 lg:px-24 bg-neutral-900">
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Giải pháp toàn diện
          </h2>
          <p className="text-lg text-neutral-400">
            Hệ sinh thái Lock.R được thiết kế để đáp ứng mọi nhu cầu
          </p>
        </motion.div>

        <Carousel items={cards} autoPlay={true} autoPlayInterval={3000} />

        {/* Feature Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-7xl mx-auto"
        >
          {/* {[
            { icon: "🚀", label: "Triển khai nhanh", desc: "Chỉ trong 24h" },
            { icon: "🔧", label: "Tùy chỉnh linh hoạt", desc: "Theo nhu cầu" },
            { icon: "💡", label: "Hỗ trợ tận tình", desc: "Mọi lúc mọi nơi" },
          ].map((feature, index) => (
            <div
              key={index}
              className="text-center p-8 bg-neutral-800 rounded-2xl border border-neutral-700 hover:border-neutral-600 transition-colors"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <div className="text-xl font-semibold text-white mb-2">
                {feature.label}
              </div>
              <div className="text-neutral-400">{feature.desc}</div>
            </div>
          ))} */}
        </motion.div>
      </div>
    </section>
  );
}

const ShowcaseContent = () => {
  return (
    <>
      {[...new Array(3).fill(1)].map((_, index) => {
        return (
          <div
            key={"showcase-content" + index}
            className="bg-neutral-800 p-8 md:p-14 rounded-3xl mb-4"
          >
            <p className="text-neutral-400 text-base md:text-2xl font-sans max-w-3xl mx-auto">
              <span className="font-bold text-white">
                Trải nghiệm đẳng cấp.
              </span>{" "}
              Lock.R mang đến giải pháp hoàn hảo cho mọi nhu cầu lưu trữ thông
              minh. Từ cá nhân đến doanh nghiệp, chúng tôi có giải pháp phù hợp
              cho bạn.
            </p>
            <img
              src="https://via.placeholder.com/800x400/667EEA/FFFFFF?text=Showcase+Feature"
              alt="Showcase detail"
              className="md:w-1/2 md:h-1/2 h-full w-full mx-auto object-contain mt-8 rounded-2xl"
            />
          </div>
        );
      })}
    </>
  );
};

const showcaseData = [
  {
    category: "Học sinh - Sinh viên",
    title: "Giải pháp cho trường học",
    src: "https://via.placeholder.com/600x800/3498DB/FFFFFF?text=Campus+Solution",
    content: <ShowcaseContent />,
  },
  {
    category: "Doanh nghiệp",
    title: "Quản lý văn phòng",
    src: "https://via.placeholder.com/600x800/9B59B6/FFFFFF?text=Enterprise",
    content: <ShowcaseContent />,
  },
  {
    category: "Trung tâm thương mại",
    title: "Retail & Shopping",
    src: "https://via.placeholder.com/600x800/E74C3C/FFFFFF?text=Retail",
    content: <ShowcaseContent />,
  },
  {
    category: "Gym & Fitness",
    title: "Phòng tập thể thao",
    src: "https://via.placeholder.com/600x800/27AE60/FFFFFF?text=Gym+Solution",
    content: <ShowcaseContent />,
  },
  {
    category: "Bệnh viện",
    title: "Healthcare Solution",
    src: "https://via.placeholder.com/600x800/E67E22/FFFFFF?text=Healthcare",
    content: <ShowcaseContent />,
  },
  {
    category: "Resort & Hotel",
    title: "Hospitality Solution",
    src: "https://via.placeholder.com/600x800/16A085/FFFFFF?text=Hospitality",
    content: <ShowcaseContent />,
  },
];

export default AppleCardsShowcaseSection;
