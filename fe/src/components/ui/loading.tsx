import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className,
  text 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
};

interface PageLoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export const PageLoading: React.FC<PageLoadingProps> = ({ 
  message = 'Đang tải dữ liệu...', 
  fullScreen = false 
}) => {
  return (
    <div className={cn(
      'flex items-center justify-center',
      fullScreen ? 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50' : 'min-h-[400px] w-full'
    )}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

interface TableLoadingProps {
  rows?: number;
  columns?: number;
}

export const TableLoading: React.FC<TableLoadingProps> = ({ rows = 5, columns = 6 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div 
              key={j} 
              className="h-12 flex-1 animate-pulse rounded-md bg-muted"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

interface CardLoadingProps {
  count?: number;
}

export const CardLoading: React.FC<CardLoadingProps> = ({ count = 4 }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
};

interface ButtonLoadingProps {
  text?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({ 
  text = 'Đang xử lý...', 
  variant = 'default' 
}) => {
  return (
    <button 
      disabled 
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
        variant === 'default' && 'bg-primary text-primary-foreground',
        variant === 'outline' && 'border border-input bg-background',
        variant === 'ghost' && 'bg-transparent',
        'cursor-not-allowed opacity-60'
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </button>
  );
};
