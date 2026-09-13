import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FrameSequence from "../shared/FrameSequence";

interface LockerInfo {
  title: string;
  subtitle: string;
  description: string;
  frameRange: [number, number];
}

const lockerInfos: LockerInfo[] = [
  {
    title: "Giới thiệu hệ thống",
    subtitle: "Lock.R Smart Locker",
    description:
      "Hệ thống locker thông minh tiên tiến, tích hợp công nghệ IoT và AI để quản lý quần áo tự động, an toàn và hiệu quả.",
    frameRange: [1, 70],
  },
  {
    title: "Locker nhỏ",
    subtitle: "Perfect for Personal Use",
    description:
      "Kích thước nhỏ gọn 30x40cm, phù hợp cho việc cá nhân. Tối ưu cho không gian hẹp nhưng vẫn đảm bảo chất lượng bảo quản.",
    frameRange: [71, 90],
  },
  {
    title: "Locker lớn",
    subtitle: "Maximum Capacity",
    description:
      "Kích thước 50x80cm, dung lượng lớn. Lý tưởng cho gia đình hoặc doanh nghiệp với nhu cầu lưu trữ nhiều quần áo.",
    frameRange: [91, 241],
  },
];

const AppleStyleLockerSection: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return;

      e.preventDefault();

      setCurrentFrame((prev) => {
        const delta = e.deltaY > 0 ? 5 : -5;
        const newFrame = Math.max(1, Math.min(241, prev + delta));

        // Update active info based on frame
        const newActiveIndex = lockerInfos.findIndex(
          (info) =>
            newFrame >= info.frameRange[0] && newFrame <= info.frameRange[1],
        );
        if (newActiveIndex !== -1) setActiveIndex(newActiveIndex);

        return newFrame;
      });
    };

    const section = sectionRef.current;
    if (section) {
      section.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      if (section) {
        section.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);

  const scrollProgress = (currentFrame - 1) / 240;

  return (
    <section
      ref={sectionRef}
      className="relative py-20 px-8 md:px-16 lg:px-24 bg-black overflow-hidden"
      style={{ minHeight: "calc(90vh + 10px)" }}
    >
      <div
        ref={containerRef}
        className="max-w-7xl mx-auto bg-black/50 backdrop-blur-sm rounded-3xl p-20 relative"
        style={{ minHeight: "calc(90vh + 10px)" }}
      >
        {/* Animation Canvas - Full Section */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <FrameSequence scrollProgress={scrollProgress} />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Frame Counter & Progress */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="sticky top-20">
              {/* Frame Counter */}
              {/* <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                  <span className="text-white/60 text-sm">Frame</span>
                  <span className="text-white font-mono text-lg font-bold">
                    {currentFrame.toString().padStart(3, "0")}
                  </span>
                  <span className="text-white/60 text-sm">/ 241</span>
                </div>
              </div> */}

              {/* Progress Bar */}
              {/* <div className="mt-4 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-600"
                  style={{ width: `${scrollProgress * 100}%` }}
                />
              </div> */}
            </div>
          </motion.div>

          {/* Content with Line Pointer */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                {/* Straight Line Pointer */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute -left-16 top-1/2 w-12 h-0.5 bg-gradient-to-r from-transparent to-white/40 origin-left"
                  style={{ transform: "translateY(-50%)" }}
                />

                {/* Content Card */}
                <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h3 className="text-5xl font-bold mb-2 bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
                      {lockerInfos[activeIndex].title}
                    </h3>
                    <p className="text-xl text-white/60 mb-6">
                      {lockerInfos[activeIndex].subtitle}
                    </p>
                    <p className="text-lg text-white/80 leading-relaxed">
                      {lockerInfos[activeIndex].description}
                    </p>

                    {/* Frame Range Indicator */}
                    <div className="mt-8 pt-6 border-t border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="text-xs text-white/40 mb-1">
                            FRAME RANGE
                          </div>
                          <div className="text-sm font-mono text-white/60">
                            {lockerInfos[activeIndex].frameRange[0]
                              .toString()
                              .padStart(3, "0")}{" "}
                            -{" "}
                            {lockerInfos[activeIndex].frameRange[1]
                              .toString()
                              .padStart(3, "0")}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-white/40 mb-1">
                            CURRENT
                          </div>
                          <div className="text-sm font-mono text-orange-400 font-bold">
                            {currentFrame.toString().padStart(3, "0")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Navigation Dots */}
                <div className="flex justify-center gap-3 mt-6">
                  {lockerInfos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setActiveIndex(index);
                        setCurrentFrame(lockerInfos[index].frameRange[0]);
                      }}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === activeIndex
                          ? "bg-orange-500 w-8"
                          : "bg-white/30 hover:bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Scroll Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-white/40 text-sm">Scroll to explore</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2"
            >
              <div className="w-1 h-2 bg-white/40 rounded-full" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AppleStyleLockerSection;
