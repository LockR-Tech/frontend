import React, { createContext, useContext, useEffect, useState } from "react";
import { useScroll } from "framer-motion";

interface ScrollContextType {
  globalScrollProgress: number;
  getFrameForProgress: (
    progress: number,
    startFrame: number,
    endFrame: number,
  ) => number;
}

const ScrollContext = createContext<ScrollContextType>({
  globalScrollProgress: 0,
  getFrameForProgress: () => 0,
});

export const useGlobalScroll = () => useContext(ScrollContext);

interface ScrollProviderProps {
  children: React.ReactNode;
  totalFrames?: number;
}

export const ScrollProvider: React.FC<ScrollProviderProps> = ({
  children,
  totalFrames = 241,
}) => {
  const [globalScrollProgress, setGlobalScrollProgress] = useState(0);

  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      setGlobalScrollProgress(latest);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  const getFrameForProgress = (
    progress: number,
    startFrame: number,
    endFrame: number,
  ): number => {
    // Map section progress (0-1) to frame range
    const frameCount = endFrame - startFrame + 1;
    const frameIndex = Math.floor(progress * frameCount);
    return Math.min(startFrame + frameIndex, endFrame);
  };

  return (
    <ScrollContext.Provider
      value={{ globalScrollProgress, getFrameForProgress }}
    >
      {children}
    </ScrollContext.Provider>
  );
};
