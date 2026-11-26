import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Chữ cái đầu của từ đầu và từ cuối ("Bảo Huy Huỳnh" → "BH"); thiếu tên thì lấy 2 ký tự đầu email. */
export function getInitials(name?: string | null, fallback?: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (fallback ?? "U").slice(0, 2).toUpperCase();
}
