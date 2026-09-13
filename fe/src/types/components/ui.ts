import type { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

// ============================================
// UI Component Props Types (shadcn/ui)
// ============================================

// Button Component (referenced from button.tsx)
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<ReturnType<typeof cva>> {
  asChild?: boolean;
}

// Badge Component (referenced from badge.tsx)
export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<ReturnType<typeof cva>> {}

// Textarea Component (referenced from textarea.tsx)
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

// Calendar Component (referenced from calendar.tsx)
export type CalendarProps = React.ComponentProps<any>;

// Status Card Component (referenced from status-card.tsx)
export type StatusCardProps = {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
};

// Chart Config (referenced from chart.tsx)
export type ChartConfig = {
  [key: string]: {
    label: string;
    color: string;
  };
};
