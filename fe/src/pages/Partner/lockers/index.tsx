import { Box as BoxIcon, AlertTriangle, RefreshCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardContent,
  PageLoading,
  ErrorState,
  EmptyData,
} from "~/components/ui";
import { useLockers } from "./hooks/useLockers";
import { LockerStats } from "./components/LockerStats";
import { LockerSelect } from "./components/LockerSelect";
import { StatusFilter } from "./components/StatusFilter";
import { LockerInfo } from "./components/LockerInfo";
import { BoxGrid } from "./components/BoxGrid";
import { EmergencyModal } from "./components/EmergencyModal";
import { ErrorToast } from "./components/ErrorToast";
import type { LockerBox } from "@/types/partner.type";
import { useState } from "react";
import { getBoxStatusLabel } from "./utils/locker-helpers";

export default function PartnerLockers() {
  const {
    lockers,
    selectedLocker,
    filterStatus,
    setFilterStatus,
    handleLockerChange,
    filteredBoxes,
    stats,
    isLoading,
    isFetching,
    error,
    refetch,
    clearFilters,
    hasActiveFilters,
    errorToast,
    setErrorToast,
  } = useLockers();
  const { t } = useTranslation();

  const [emergencyModal, setEmergencyModal] = useState<{
    open: boolean;
    box: LockerBox | null;
  }>({ open: false, box: null });

  const handleBoxClick = (box: LockerBox) => {
    if (box.status === "OCCUPIED" || box.status === "MAINTENANCE") {
      setEmergencyModal({ open: true, box });
    } else {
      alert(
        `Ô: ${box.boxNumber}\nTrạng thái: ${getBoxStatusLabel(box.status)}`,
      );
    }
  };

  const handleEmergencyUnlock = () => {
    if (!emergencyModal.box) return;
    alert(
      `⚠️ Yêu cầu mở khẩn cấp ô ${emergencyModal.box.boxNumber} đã được ghi nhận.\nVui lòng liên hệ Admin để được hỗ trợ.`,
    );
    setEmergencyModal({ open: false, box: null });
  };

  const handleReportIssue = () => {
    if (!emergencyModal.box) return;
    alert(
      `📝 Đã ghi nhận báo cáo sự cố ô ${emergencyModal.box.boxNumber}.\nĐội kỹ thuật sẽ kiểm tra trong thờii gian sớm nhất.`,
    );
    setEmergencyModal({ open: false, box: null });
  };

  return (
    <div className="min-h-screen bg-[#FAFCFF] p-8">
      {/* Error Toast */}
      <ErrorToast message={errorToast} onClose={() => setErrorToast(null)} />

      {/* Polling Indicator */}
      {isFetching && !isLoading && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-blue-100 text-blue-700 px-3 py-2 rounded-full text-sm flex items-center gap-2 shadow">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            {t("partner.common.updating")}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#326B9C]">
              {t("partner.lockers.title")}
            </h1>
            <p className="text-[#7BAAD1] mt-1">
              {t("partner.lockers.subtitle")}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="border-[#B0C8DA]"
            >
              <X size={16} className="mr-2" />
              Xóa lọc
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-[#B0C8DA]"
            >
              <RefreshCw
                size={16}
                className={`mr-2 ${isFetching ? "animate-spin" : ""}`}
              />
              {t("button.refresh")}
            </Button>
            <Button className="bg-[#326B9C] hover:bg-[#7BAAD1] text-white font-semibold">
              <AlertTriangle size={16} className="mr-2" />
              {t("partner.lockers.reportIssue")}
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <PageLoading message={t("partner.lockers.loadingTitle")} />
        ) : error ? (
          <ErrorState
            variant="server"
            title={t("partner.lockers.errorTitle")}
            error={error}
            onRetry={refetch}
          />
        ) : lockers.length === 0 ? (
          <EmptyData
            title={t("partner.lockers.empty.title")}
            message={t("partner.lockers.empty.message")}
            icon={<BoxIcon className="h-16 w-16 text-muted-foreground" />}
          />
        ) : (
          <>
            {/* Stats Cards */}
            <LockerStats stats={stats} />

            {/* Locker Selection & Filter */}
            <Card className="border-[#E8E9EB]">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <LockerSelect
                      lockers={lockers}
                      selectedLockerId={selectedLocker?.id?.toString()}
                      onChange={handleLockerChange}
                    />
                  </div>
                  <StatusFilter
                    value={filterStatus}
                    onChange={setFilterStatus}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Selected Locker Info */}
            {selectedLocker && <LockerInfo locker={selectedLocker} />}

            {/* Boxes Grid */}
            {selectedLocker && (
              <BoxGrid
                boxes={filteredBoxes}
                totalBoxes={selectedLocker.totalBoxes}
                filterStatus={filterStatus}
                onBoxClick={handleBoxClick}
                onEmergencyClick={(box) =>
                  setEmergencyModal({ open: true, box })
                }
              />
            )}
          </>
        )}
      </div>

      {/* Emergency Unlock Modal */}
      <EmergencyModal
        isOpen={emergencyModal.open}
        onClose={() => setEmergencyModal({ open: false, box: null })}
        box={emergencyModal.box}
        onUnlock={handleEmergencyUnlock}
        onReport={handleReportIssue}
      />
    </div>
  );
}
