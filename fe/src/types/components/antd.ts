import type { Dayjs } from 'dayjs';
import type React from 'react';

// ============================================
// Ant Design Component Props Types
// ============================================

// Select Component
export interface SelectComponentProps {
  placeholder?: string;
  defaultValue?: string | string[];
  value?: string | string[];
  mode?: 'multiple' | 'tags';
  showSearch?: boolean;
  allowClear?: boolean;
  disabled?: boolean;
  size?: 'large' | 'middle' | 'small';
  options?: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  onChange?: (value: string | string[]) => void;
  onSearch?: (value: string) => void;
  filterOption?: boolean | ((input: string, option?: any) => boolean);
}

// Message Component
export interface MessageComponentProps {
  showButtons?: boolean;
  customMessages?: {
    success?: string;
    error?: string;
    warning?: string;
    info?: string;
  };
}

// Pagination Component
export interface AntPaginationProps {
  total?: number;
  defaultCurrent?: number;
  pageSize?: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  onChange?: (page: number, pageSize: number) => void;
  onShowSizeChange?: (current: number, size: number) => void;
}

// Carousel Component
export interface AntCarouselProps {
  autoplay?: boolean;
  autoplaySpeed?: number;
  dots?: boolean;
  dotPosition?: 'top' | 'bottom' | 'left' | 'right';
  effect?: 'scrollx' | 'fade';
  infinite?: boolean;
  speed?: number;
  slidesToShow?: number;
  slidesToScroll?: number;
  children?: React.ReactNode;
  customSlides?: Array<{
    content: React.ReactNode;
    key?: string;
  }>;
}

// DatePicker Component
export interface DatePickerComponentProps {
  placeholder?: string | [string, string];
  defaultValue?: Dayjs | [Dayjs, Dayjs];
  value?: Dayjs | [Dayjs, Dayjs];
  format?: string;
  size?: 'large' | 'middle' | 'small';
  disabled?: boolean;
  allowClear?: boolean;
  showTime?: boolean;
  showToday?: boolean;
  onChange?: (date: Dayjs | null, dateString: string) => void;
}

// RangePicker Component
export interface RangePickerComponentProps {
  placeholder?: [string, string];
  defaultValue?: [Dayjs, Dayjs];
  value?: [Dayjs, Dayjs];
  format?: string;
  size?: 'large' | 'middle' | 'small';
  disabled?: boolean | [boolean, boolean];
  allowClear?: boolean;
  allowEmpty?: [boolean, boolean];
  showTime?: boolean;
  onChange?: (dates: [Dayjs | null, Dayjs | null] | null, dateStrings: [string, string]) => void;
}

// Steps Component
export interface StepsComponentProps {
  current?: number;
  direction?: 'horizontal' | 'vertical';
  size?: 'default' | 'small';
  type?: 'default' | 'navigation';
  onChange?: (current: number) => void;
  customSteps?: Array<{
    title: string;
    description?: string;
    icon?: React.ReactNode;
    status?: 'wait' | 'process' | 'finish' | 'error';
  }>;
}
