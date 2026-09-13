import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface FrameSequenceProps {
  scrollProgress: number;
  startFrame?: number;
  endFrame?: number;
  className?: string;
}

// Import all frames using Vite's glob import
const frameModules = import.meta.glob("../../assets/ezgif-frame-*.jpg", {
  eager: true,
});

const FrameSequence: React.FC<FrameSequenceProps> = ({
  scrollProgress,
  startFrame = 1,
  endFrame = 241,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Preload images
  useEffect(() => {
    const loadImages = async () => {
      const imagePromises: Promise<HTMLImageElement>[] = [];

      for (let i = startFrame; i <= endFrame; i++) {
        const frameNumber = i.toString().padStart(3, "0");
        const modulePath = `../../assets/ezgif-frame-${frameNumber}.jpg`;

        const promise = new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();

          // Get the module from the glob import
          const module = frameModules[modulePath] as { default: string };

          if (module && module.default) {
            img.src = module.default;
            img.onload = () => resolve(img);
            img.onerror = () => {
              console.warn(`Failed to load frame ${frameNumber}`);
              resolve(img);
            };
          } else {
            console.warn(`Frame not found: ${frameNumber}`);
            resolve(img);
          }
        });

        imagePromises.push(promise);
      }

      try {
        const loadedImages = await Promise.all(imagePromises);
        const validImages = loadedImages.filter(
          (img) => img.complete && img.naturalWidth > 0,
        );
        setImages(validImages);
        setImagesLoaded(true);
      } catch (error) {
        console.error("Error loading frames:", error);
        setImagesLoaded(true);
      }
    };

    loadImages();
  }, [startFrame, endFrame]);

  // Render current frame based on scroll
  useEffect(() => {
    if (!canvasRef.current || !imagesLoaded || images.length === 0) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const frameIndex = Math.min(
      Math.floor(scrollProgress * images.length),
      images.length - 1,
    );

    const img = images[frameIndex];
    if (img && img.complete) {
      // Set canvas size to match image aspect ratio
      canvas.width = img.width;
      canvas.height = img.height;

      // Clear and draw
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  }, [scrollProgress, images, imagesLoaded]);

  return (
    <div className={`relative ${className}`}>
      {!imagesLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải animation...</p>
          </div>
        </div>
      )}
      <motion.canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
        initial={{ opacity: 0 }}
        animate={{ opacity: imagesLoaded ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
};

export default FrameSequence;
