import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

const VideoHeroSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (videoRef.current) {
            videoRef.current.play();
          }
        }
      },
      { threshold: 0.3 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen flex items-center justify-center overflow-hidden bg-black"
    >
      {/* Video Background */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      >
        <source
          src="https://www.apple.com/105/media/us/iphone-14-pro/2022/d555a0c1-6c87-4b7e-b6a9-1bf09cece19a/anim/hero/large.mp4"
          type="video/mp4"
        />
      </video>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70"></div>

      {/* Content */}
      <div
        className={`relative z-10 text-center px-8 transition-all duration-1500 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <h1 className="text-6xl md:text-8xl font-semibold text-white mb-6 tracking-tight">
          Trải nghiệm tương lai
        </h1>
        <p className="text-2xl md:text-3xl text-gray-300 mb-12 font-light max-w-3xl mx-auto">
          Lock.R mang đến sự tiện lợi vượt trội trong từng khoảnh khắc
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          <Button className="bg-white text-black hover:bg-gray-200 px-8 py-6 text-lg rounded-full transition-all duration-300 hover:scale-105">
            Khám phá ngay
          </Button>
          <Button
            variant="outline"
            className="border-2 border-white text-white hover:bg-white hover:text-black px-8 py-6 text-lg rounded-full transition-all duration-300 hover:scale-105"
          >
            <Play className="mr-2 h-5 w-5" />
            Xem video
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center pt-2">
          <div className="w-1 h-3 bg-white/50 rounded-full"></div>
        </div>
      </div>
    </section>
  );
};

export default VideoHeroSection;
