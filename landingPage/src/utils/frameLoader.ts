// Generate frame imports at build time
// This file helps Vite to properly bundle all frame images

const frames: Record<string, string> = {};

// Import all frames dynamically
for (let i = 1; i <= 241; i++) {
  const frameNumber = i.toString().padStart(3, '0');
  try {
    frames[frameNumber] = new URL(`../assets/ezgif-frame-${frameNumber}.jpg`, import.meta.url).href;
  } catch (e) {
    console.warn(`Frame ${frameNumber} not found`);
  }
}

export const getFramePath = (frameNumber: number): string => {
  const paddedNumber = frameNumber.toString().padStart(3, '0');
  return frames[paddedNumber] || '';
};

export const getTotalFrames = (): number => {
  return Object.keys(frames).length;
};

export default frames;
