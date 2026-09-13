import React, { useEffect, useRef, useState } from "react";

const PartnersSection: React.FC = () => {
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

  const partners = [
    "Đại học Bách Khoa",
    "Đại học Kinh Tế",
    "Đại học Y Hà Nội",
    "VinGroup",
    "FPT Software",
    "Viettel",
    "VNPT",
    "Momo",
    "VNPay",
    "Grab",
    "Shopee",
    "Lazada",
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
            Đối tác tin cậy
          </h2>
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
            Được sử dụng và tin tưởng bởi các tổ chức hàng đầu
          </p>
        </div>

        {/* Partners Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {partners.map((partner, index) => (
            <div
              key={index}
              className={`flex items-center justify-center p-8 bg-white rounded-2xl hover:shadow-xl transition-all duration-500 group ${
                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
              }`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div className="text-center">
                <div className="text-2xl font-semibold text-neutral-400 group-hover:text-neutral-900 transition-colors duration-300">
                  {partner}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Text */}
        <div
          className={`text-center mt-20 transition-all duration-1000 delay-600 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-lg text-neutral-600 mb-8">
            Và hơn 100+ đối tác khác trên toàn quốc
          </p>
          <button className="px-8 py-4 bg-neutral-900 text-white rounded-full font-semibold hover:bg-neutral-800 transition-all duration-300 hover:scale-105">
            Trở thành đối tác
          </button>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
