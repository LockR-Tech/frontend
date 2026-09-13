import React, { useEffect, useRef } from "react";
import gsap from "gsap";

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
}

const GradientText: React.FC<GradientTextProps> = ({
  children,
  className = "",
  gradient = "linear-gradient(90deg, #FF6B35, #F7931E, #FFC75F)",
}) => {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!textRef.current) return;

    gsap.fromTo(
      textRef.current,
      {
        backgroundPosition: "0% 50%",
      },
      {
        backgroundPosition: "100% 50%",
        duration: 3,
        ease: "none",
        repeat: -1,
        yoyo: true,
      },
    );
  }, []);

  return (
    <span
      ref={textRef}
      className={`inline-block bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: gradient,
        backgroundSize: "200% 200%",
      }}
    >
      {children}
    </span>
  );
};

export default GradientText;
