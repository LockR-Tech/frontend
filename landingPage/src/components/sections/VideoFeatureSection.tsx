import React, { useEffect, useRef, useState } from "react";

const VideoFeatureSection: React.FC = () => {
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
      { threshold: 0.4 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-neutral-900"
    >
      {/* Video Background */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      >
        <source
          src="https://www.apple.com/105/media/us/airpods-pro/2019/133dt7y63/anim/hero/large.mp4"
          type="video/mp4"
        />
      </video>

      {/* Content Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <div
            className={`transition-all duration-1000 ${
              isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-20"
            }`}
          >
            <div className="text-sm font-semibold text-gray-400 mb-4 tracking-wider uppercase">
              Công nghệ tiên tiến
            </div>
            <h2 className="text-5xl md:text-7xl font-semibold text-white mb-8 tracking-tight">
              An toàn
              <br />
              tuyệt đối
            </h2>
            <p className="text-xl text-gray-400 mb-12 leading-relaxed">
              Hệ thống mã hóa đa lớp kết hợp với công nghệ blockchain đảm bảo
              tài sản của bạn luôn được bảo vệ tối đa.
            </p>
            <div className="space-y-6">
              {[
                "Mã hóa AES-256 bit",
                "Xác thực sinh trắc học",
                "Blockchain tracking",
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-4 transition-all duration-700 ${
                    isVisible
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-10"
                  }`}
                  style={{ transitionDelay: `${300 + idx * 150}ms` }}
                >
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-lg text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Element */}
          <div
            className={`transition-all duration-1000 delay-300 ${
              isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-20"
            }`}
          >
            <div className="relative aspect-square">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl backdrop-blur-xl border border-white/10"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoFeatureSection;
