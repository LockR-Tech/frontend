import { PackageX, RefreshCw, Search, Plus, FileX } from "lucide-react";
import { Button } from "~/components/ui/button";

interface EmptyProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export function Empty({
  icon,
  title = "Không có dữ liệu",
  description = "Chưa có thông tin để hiển thị",
  action,
  className = "",
}: EmptyProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="mb-4 text-gray-300">
        {icon || <PackageX size={64} strokeWidth={1} />}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="flex items-center gap-2">
          {action.icon || <Plus size={16} />}
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Empty đơn giản
export function SimpleEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <PackageX size={48} className="text-gray-300 mb-2" strokeWidth={1} />
      <p className="text-gray-400 text-sm">Không có dữ liệu</p>
    </div>
  );
}

// Empty cho danh sách xe trống
export function NoCarEmpty({
  onAddCar,
  onRefresh,
}: {
  onAddCar?: () => void;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <PackageX size={64} className="text-gray-300 mb-4" strokeWidth={1} />
      <p className="text-gray-500 mb-4">Không tìm thấy xe nào phù hợp với tiêu chí của bạn</p>
      <div className="flex gap-2">
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline" className="flex items-center gap-2">
            <RefreshCw size={16} />
            Làm mới
          </Button>
        )}
        {onAddCar && (
          <Button onClick={onAddCar} variant="outline" className="flex items-center gap-2">
            <Search size={16} />
            Tìm kiếm lại
          </Button>
        )}
      </div>
    </div>
  );
}

// Empty cho lịch sử đặt xe
export function NoBookingHistoryEmpty({
  onCreateBooking,
}: {
  onCreateBooking?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4">
        <img
          src="/placeholder.svg"
          alt="Empty"
          className="w-16 h-16 opacity-50"
        />
      </div>
      <p className="text-gray-500 mb-4">Bạn chưa có lịch sử đặt xe nào</p>
      {onCreateBooking && (
        <Button
          onClick={onCreateBooking}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Plus size={16} />
          Đặt xe ngay
        </Button>
      )}
    </div>
  );
}

// Empty cho tìm kiếm
export function NoSearchResultEmpty({
  searchTerm,
  onClearSearch,
}: {
  searchTerm?: string;
  onClearSearch?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Search size={64} className="text-gray-300 mb-4" strokeWidth={1} />
      <div className="text-gray-500 mb-4">
        <p>Không tìm thấy kết quả cho &quot;{searchTerm}&quot;</p>
        <p className="text-sm mt-1">Hãy thử tìm kiếm với từ khóa khác</p>
      </div>
      {onClearSearch && (
        <Button onClick={onClearSearch} variant="outline">
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}

// Empty cho dữ liệu tải về
export function NoDataEmpty({
  title = "Không có dữ liệu",
  description = "Chưa có thông tin để hiển thị",
  action,
}: {
  title?: string;
  description?: string;
  action?: {
    text: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <FileX size={64} className="text-gray-300 mb-4" strokeWidth={1} />
      <div className="text-gray-500 mb-4">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm mt-1">{description}</p>
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          className="flex items-center gap-2"
        >
          {action.icon || <Plus size={16} />}
          {action.text}
        </Button>
      )}
    </div>
  );
}

// Empty với custom image
export function CustomImageEmpty({
  imageSrc = '/placeholder.svg',
  title = "Trống",
  description = "Không có dữ liệu để hiển thị",
  imageHeight = 100,
}: {
  imageSrc?: string;
  title?: string;
  description?: string;
  imageHeight?: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <img
        src={imageSrc}
        alt="Empty"
        style={{ height: imageHeight }}
        className="mb-4 opacity-70"
      />
      <div className="text-gray-500">
        <p className="font-medium text-gray-900 text-base">{title}</p>
        <p className="text-sm mt-1">{description}</p>
      </div>
    </div>
  );
}

// Empty size nhỏ
export function SmallEmpty({ description = "Không có dữ liệu" }: { description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 text-center">
      <PackageX size={32} className="text-gray-300 mb-1" strokeWidth={1} />
      <span className="text-gray-400 text-sm">{description}</span>
    </div>
  );
}

export default Empty;
