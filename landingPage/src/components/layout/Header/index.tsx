import { Button } from "@/components/ui/button";
import { IMAGES, PATH } from "@/constants";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        // Fixed & center với top 10px
        "fixed top-[10px] left-1/2 z-50 -translate-x-1/2 transition-all duration-300",
        "flex items-center rounded-full shadow-lg",
        scrolled
          ? "bg-white/80 backdrop-blur-md"
          : "bg-white/40 backdrop-blur-sm",

        // Tablet - smaller size
        "gap-2 py-1 px-2.5",

        // Desktop - smaller size
        "xl:gap-6 xl:px-4 xl:py-1.5",
      )}
    >
      <a href={PATH.main}>
        {/* Logo - Desktop (shown on md and above) */}
        <div className="hidden h-6 w-36 shrink-0 items-center md:flex">
          <img
            src={IMAGES.Logo}
            alt="Logo"
            className="h-6 w-auto"
            loading="lazy"
          />
        </div>

        {/* Logo - Tablet (shown below md breakpoint) */}
        <div className="flex h-4 w-18 shrink-0 items-center md:hidden">
          <img
            src={IMAGES.LogoTablet}
            alt="Logo Tablet"
            className="h-4 w-auto"
            loading="lazy"
          />
        </div>
      </a>

      {/* Navigation Section */}
      <nav
        className={cn(
          // Common
          "flex flex-1 items-center whitespace-nowrap gap-2 xl:gap-6",
        )}
      >
        <a
          href={PATH.product}
          className={cn(
            // Common
            "text-blue-600 hover:text-gray-900 font-normal tracking-normal whitespace-nowrap transition-colors",
            // Tablet (default)
            "text-xs leading-4",
            // Desktop (md and up)
            "md:text-sm md:leading-5",
          )}
        >
          Sản phẩm
        </a>

        <a
          href={PATH.solution}
          className={cn(
            // Common
            "text-blue-600 hover:text-gray-900 font-normal tracking-normal whitespace-nowrap transition-colors",
            // Tablet (default)
            "text-xs leading-4",
            // Desktop (md and up)
            "md:text-sm md:leading-5",
          )}
        >
          Giải pháp
        </a>

        <a
          href={PATH.howItWorks}
          className={cn(
            // Common
            "text-blue-600 hover:text-gray-900 font-normal tracking-normal whitespace-nowrap transition-colors",
            // Tablet (default)
            "text-xs leading-4",
            // Desktop (md and up)
            "md:text-sm md:leading-5",
          )}
        >
          Cách hoạt động
        </a>

        <a
          href={PATH.enterprise}
          className={cn(
            // Common
            "text-blue-600 hover:text-gray-900 font-normal tracking-normal whitespace-nowrap transition-colors",
            // Tablet (default)
            "text-xs leading-4",
            // Desktop (md and up)
            "md:text-sm md:leading-5",
          )}
        >
          Doanh nghiệp
        </a>

        <a
          href={PATH.aiExpansion}
          className={cn(
            // Common
            "text-blue-600 hover:text-gray-900 font-normal tracking-normal whitespace-nowrap transition-colors",
            // Tablet (default)
            "text-xs leading-4",
            // Desktop (md and up)
            "md:text-sm md:leading-5",
          )}
        >
          Mở rộng AI
        </a>

        {/* Button */}
        <Button
          variant="default"
          className="rounded-[24px] px-2 py-1 text-xs xl:rounded-[48px] xl:px-2.5 xl:py-1.5 xl:text-sm xl:leading-5"
        >
          Bắt đầu
        </Button>
      </nav>
    </header>
  );
}
