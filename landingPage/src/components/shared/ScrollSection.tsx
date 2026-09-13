import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import FrameSequence from "./FrameSequence";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ScrollSectionProps {
  title: string;
  description: string;
  badge: string;
  icon: string;
  features: string[];
  reverse?: boolean;
  frameStart: number;
  frameEnd: number;
}

const ScrollSection: React.FC<ScrollSectionProps> = ({
  title,
  description,
  badge,
  icon,
  features,
  reverse = false,
  frameStart,
  frameEnd,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const scale = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0.95, 1, 1, 0.95],
  );
  const x = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    reverse ? [30, 0, -30] : [-30, 0, 30],
  );

  // Đồng bộ frames với scroll - frames di chuyển theo scroll position
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      // Map scroll range 0.15-0.85 (section visible) to 0-1 frame progress
      const normalizedProgress = Math.max(
        0,
        Math.min(1, (latest - 0.15) / 0.7),
      );
      setScrollProgress(normalizedProgress);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  const frameCount = frameEnd - frameStart + 1;

  return (
    <div ref={sectionRef} className="min-h-screen flex items-center py-20">
      <div
        className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full ${reverse ? "lg:flex-row-reverse" : ""}`}
      >
        {/* Frame Sequence Animation - Scroll Synchronized */}
        <motion.div
          style={{ opacity, scale }}
          className={`h-[500px] lg:h-[600px] relative ${reverse ? "lg:order-2" : "lg:order-1"}`}
        >
          <FrameSequence
            scrollProgress={scrollProgress}
            startFrame={frameStart}
            endFrame={frameEnd}
            className="h-full rounded-xl overflow-hidden shadow-2xl"
          />
          {/* Frame counter indicator */}
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs backdrop-blur-sm font-mono">
            Frame {Math.floor(scrollProgress * frameCount) + frameStart}/
            {frameEnd}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          style={{ opacity, x }}
          className={`${reverse ? "lg:order-1" : "lg:order-2"}`}
        >
          <Card className="border-2 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-4 mb-4">
                <Badge className="text-lg px-4 py-2" variant="default">
                  {badge}
                </Badge>
                <span className="text-5xl">{icon}</span>
              </div>
              <CardTitle className="text-4xl mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {title}
              </CardTitle>
              <CardDescription className="text-lg leading-relaxed text-gray-700">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 text-base text-gray-600"
                  >
                    <span className="text-blue-500 text-xl">✓</span>
                    {feature}
                  </motion.li>
                ))}
              </ul>
              <Button className="w-full mt-6" size="lg">
                Tìm hiểu thêm →
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ScrollSection;
