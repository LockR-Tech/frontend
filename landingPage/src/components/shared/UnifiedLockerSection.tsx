import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FrameSequence from "@/components/shared/FrameSequence";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LockerInfo {
  id: number;
  title: string;
  description: string;
  badge: string;
  icon: string;
  frameStart: number;
  frameEnd: number;
  features: string[];
  position: "top" | "middle" | "bottom";
}

const lockerData: LockerInfo[] = [
  {
    id: 1,
    title: "Locker Nhỏ",
    description: "Ô locker nhỏ hoàn hảo cho đồ cá nhân, quần áo nhẹ, phụ kiện.",
    badge: "Compact",
    icon: "📦",
    frameStart: 1,
    frameEnd: 70,
    features: [
      "Kích thước nhỏ gọn, tối ưu",
      "Phù hợp đồ cá nhân, phụ kiện",
      "Khóa điện tử thông minh",
      "Giá cả hợp lý",
    ],
    position: "top",
  },
  {
    id: 2,
    title: "Locker Trung Bình",
    description:
      "Ô locker trung với không gian vừa phải, phù hợp cho đồ hàng ngày.",
    badge: "Standard",
    icon: "📋",
    frameStart: 71,
    frameEnd: 92,
    features: [
      "Không gian lưu trữ hợp lý",
      "Đa dạng kích thước",
      "Tổ chức ngăn nắp",
      "Thông gió tốt",
    ],
    position: "middle",
  },
  {
    id: 3,
    title: "Locker Lớn",
    description:
      "Ô locker lớn cao cấp với tính năng đặc biệt và không gian rộng rãi.",
    badge: "Premium",
    icon: "⭐",
    frameStart: 93,
    frameEnd: 241,
    features: [
      "Không gian rộng rãi",
      "Hệ thống sấy khô tích hợp",
      "Công nghệ khử mùi",
      "Điều khiển nhiệt độ",
    ],
    position: "bottom",
  },
];

const UnifiedLockerSection: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(1);
  const [scrollProgress, setScrollProgress] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Xác định locker nào đang active dựa trên frame
  const getActiveLocker = (frame: number): number => {
    if (frame >= 1 && frame <= 70) return 1;
    if (frame >= 71 && frame <= 92) return 2;
    return 3;
  };

  const activeLocker = getActiveLocker(currentFrame);

  // Xử lý wheel event để thay đổi frames
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const isInView = rect.top <= window.innerHeight && rect.bottom >= 0;

      if (!isInView) return;

      e.preventDefault();

      if (isScrollingRef.current) return;
      isScrollingRef.current = true;

      // Tính toán frame mới
      const delta = e.deltaY > 0 ? 5 : -5; // Mỗi lần wheel thay đổi 5 frames
      const newFrame = Math.max(1, Math.min(241, currentFrame + delta));

      setCurrentFrame(newFrame);
      setScrollProgress((newFrame - 1) / 240);

      setTimeout(() => {
        isScrollingRef.current = false;
      }, 50);
    };

    const section = sectionRef.current;
    if (section) {
      section.addEventListener("wheel", handleWheel, { passive: false });
      return () => section.removeEventListener("wheel", handleWheel);
    }
  }, [currentFrame]);

  return (
    <section
      ref={sectionRef}
      className="min-h-screen flex items-center justify-center py-20 px-8 md:px-16 lg:px-24 relative"
    >
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center relative">
          {/* Left: Info Cards */}
          <div className="space-y-6">
            {lockerData.map((locker) => (
              <motion.div
                key={locker.id}
                initial={{ opacity: 0.5, scale: 0.95 }}
                animate={{
                  opacity: activeLocker === locker.id ? 1 : 0.4,
                  scale: activeLocker === locker.id ? 1 : 0.95,
                  x: activeLocker === locker.id ? 0 : -10,
                }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  className={`border-2 transition-all duration-300 ${
                    activeLocker === locker.id
                      ? "shadow-2xl border-blue-500 bg-white"
                      : "shadow-md border-gray-200 bg-gray-50"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge
                        variant={
                          activeLocker === locker.id ? "default" : "secondary"
                        }
                        className="text-sm px-3 py-1"
                      >
                        {locker.badge}
                      </Badge>
                      <span className="text-3xl">{locker.icon}</span>
                    </div>
                    <CardTitle className="text-2xl">{locker.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {locker.description}
                    </CardDescription>
                  </CardHeader>
                  <AnimatePresence>
                    {activeLocker === locker.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <CardContent>
                          <ul className="space-y-2">
                            {locker.features.map((feature, index) => (
                              <li
                                key={index}
                                className="flex items-center gap-2 text-sm text-gray-700"
                              >
                                <span className="text-blue-500">✓</span>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Center: Frame Animation with Arrow */}
          <div className="lg:col-span-2 relative">
            <div className="relative h-[600px]">
              {/* Frame Sequence */}
              <FrameSequence
                scrollProgress={scrollProgress}
                startFrame={1}
                endFrame={241}
                className="h-full rounded-2xl overflow-hidden shadow-2xl"
              />

              {/* Frame Counter */}
              <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm font-mono">
                Frame {currentFrame}/241
              </div>

              {/* Progress Bar */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64">
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="bg-blue-500 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentFrame / 241) * 100}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                <div className="text-center text-xs text-gray-600 mt-1">
                  {lockerData.find((l) => l.id === activeLocker)?.title}
                </div>
              </div>

              {/* Arrow Indicator */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 10 }}
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3, 0 6"
                      fill="#3b82f6"
                      className="drop-shadow-lg"
                    />
                  </marker>
                </defs>
                <motion.path
                  d={
                    activeLocker === 1
                      ? "M 300 300 L 50 100"
                      : activeLocker === 2
                        ? "M 300 300 L 50 300"
                        : "M 300 300 L 50 500"
                  }
                  stroke="#3b82f6"
                  strokeWidth="3"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  className="drop-shadow-lg"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5 }}
                />
              </svg>

              {/* Scroll Hint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: currentFrame === 1 ? 1 : 0 }}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center"
              >
                <div className="text-white text-sm mb-2 drop-shadow-lg bg-black/50 px-4 py-2 rounded-full">
                  Lăn chuột để khám phá
                </div>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-white text-2xl"
                >
                  ↓
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UnifiedLockerSection;
