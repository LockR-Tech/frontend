import { PackageX, RefreshCw, Search, Plus, FileX } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useTranslation } from "react-i18next";

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
  title,
  description,
  action,
  className = "",
}: EmptyProps) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="mb-4 text-gray-300">
        {icon || <PackageX size={64} strokeWidth={1} />}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title ?? t("common.noData")}</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-sm">{description ?? t("shared.empty.noInfo")}</p>
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <PackageX size={48} className="text-gray-300 mb-2" strokeWidth={1} />
      <p className="text-gray-400 text-sm">{t("common.noData")}</p>
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <PackageX size={64} className="text-gray-300 mb-4" strokeWidth={1} />
      <p className="text-gray-500 mb-4">{t("shared.empty.noCars")}</p>
      <div className="flex gap-2">
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline" className="flex items-center gap-2">
            <RefreshCw size={16} />
            {t("button.refresh")}
          </Button>
        )}
        {onAddCar && (
          <Button onClick={onAddCar} variant="outline" className="flex items-center gap-2">
            <Search size={16} />
            {t("shared.empty.searchAgain")}
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4">
        <img
          src="/placeholder.svg"
          alt="Empty"
          className="w-16 h-16 opacity-50"
        />
      </div>
      <p className="text-gray-500 mb-4">{t("shared.empty.noBookings")}</p>
      {onCreateBooking && (
        <Button
          onClick={onCreateBooking}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Plus size={16} />
          {t("shared.empty.bookNow")}
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Search size={64} className="text-gray-300 mb-4" strokeWidth={1} />
      <div className="text-gray-500 mb-4">
        <p>{t("shared.empty.noResultsFor", { term: searchTerm ?? "" })}</p>
        <p className="text-sm mt-1">{t("shared.empty.tryOtherKeywords")}</p>
      </div>
      {onClearSearch && (
        <Button onClick={onClearSearch} variant="outline">
          {t("shared.empty.clearFilters")}
        </Button>
      )}
    </div>
  );
}

// Empty cho dữ liệu tải về
export function NoDataEmpty({
  title,
  description,
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <FileX size={64} className="text-gray-300 mb-4" strokeWidth={1} />
      <div className="text-gray-500 mb-4">
        <p className="font-medium text-gray-900">{title ?? t("common.noData")}</p>
        <p className="text-sm mt-1">{description ?? t("shared.empty.noInfo")}</p>
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
  title,
  description,
  imageHeight = 100,
}: {
  imageSrc?: string;
  title?: string;
  description?: string;
  imageHeight?: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <img
        src={imageSrc}
        alt="Empty"
        style={{ height: imageHeight }}
        className="mb-4 opacity-70"
      />
      <div className="text-gray-500">
        <p className="font-medium text-gray-900 text-base">{title ?? t("common.empty")}</p>
        <p className="text-sm mt-1">{description ?? t("shared.empty.noDataToShow")}</p>
      </div>
    </div>
  );
}

// Empty size nhỏ
export function SmallEmpty({ description }: { description?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-4 text-center">
      <PackageX size={32} className="text-gray-300 mb-1" strokeWidth={1} />
      <span className="text-gray-400 text-sm">{description ?? t("common.noData")}</span>
    </div>
  );
}

export default Empty;
