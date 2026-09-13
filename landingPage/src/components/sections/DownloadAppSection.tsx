import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const DownloadAppSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
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
    <section ref={sectionRef} className="py-32 px-8 md:px-16 lg:px-24 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-10"
          }`}
        >
          <h2 className="text-5xl md:text-7xl font-semibold text-neutral-900 mb-6 tracking-tight">
            Tải ứng dụng Lock.R
          </h2>
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
            Trải nghiệm quản lý locker thông minh ngay trên thiết bị di động
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Google Play */}
          <div
            className={`transition-all duration-1000 delay-300 ${
              isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-20"
            }`}
          >
            <div className="bg-neutral-50 rounded-3xl p-12 hover:shadow-xl transition-all duration-500 group">
              {/* Android Icon */}
              <div className="mb-8 flex justify-center">
                <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <svg
                    className="w-16 h-16 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.43 11.43 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <h3 className="text-3xl font-semibold text-neutral-900 mb-4 text-center">
                Android
              </h3>
              <p className="text-neutral-600 mb-8 text-center leading-relaxed">
                Tải xuống ứng dụng Lock.R cho thiết bị Android từ Google Play
                Store
              </p>

              {/* Download Button */}
              <a
                href="https://play.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-6 text-lg rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center gap-3">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                  </svg>
                  Tải trên CH Play
                </Button>
              </a>

              {/* Stats */}
              <div className="mt-8 flex justify-center gap-8 text-center">
                <div>
                  <div className="text-2xl font-bold text-neutral-900">5M+</div>
                  <div className="text-sm text-neutral-500">Tải xuống</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-neutral-900">
                    4.8★
                  </div>
                  <div className="text-sm text-neutral-500">Đánh giá</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Apple Store */}
          <div
            className={`transition-all duration-1000 delay-500 ${
              isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-20"
            }`}
          >
            <div className="bg-neutral-50 rounded-3xl p-12 hover:shadow-xl transition-all duration-500 group">
              {/* iOS Icon */}
              <div className="mb-8 flex justify-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <svg
                    className="w-16 h-16 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <h3 className="text-3xl font-semibold text-neutral-900 mb-4 text-center">
                iOS
              </h3>
              <p className="text-neutral-600 mb-8 text-center leading-relaxed">
                Tải xuống ứng dụng Lock.R cho iPhone và iPad từ Apple App Store
              </p>

              {/* Download Button */}
              <a
                href="https://apps.apple.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-6 text-lg rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center gap-3">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Tải trên App Store
                </Button>
              </a>

              {/* Stats */}
              <div className="mt-8 flex justify-center gap-8 text-center">
                <div>
                  <div className="text-2xl font-bold text-neutral-900">3M+</div>
                  <div className="text-sm text-neutral-500">Tải xuống</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-neutral-900">
                    4.9★
                  </div>
                  <div className="text-sm text-neutral-500">Đánh giá</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Info */}
        <div
          className={`text-center mt-16 transition-all duration-1000 delay-700 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-neutral-600 mb-4">
            Hỗ trợ cả Android 7.0+ và iOS 13.0+
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-neutral-500">
            <span className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Miễn phí tải xuống
            </span>
            <span className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Không quảng cáo
            </span>
            <span className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Cập nhật thường xuyên
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DownloadAppSection;
