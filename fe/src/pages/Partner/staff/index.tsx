import { Plus, RefreshCw } from "lucide-react";
import { PageLoading, ErrorState } from "~/components/ui";
import { Button } from "~/components/ui/button";
import { useTranslation } from "react-i18next";
import { useStaff } from "./hooks/useStaff";
import { StaffStats } from "./components/StaffStats";
import { StaffList } from "./components/StaffList";
import { AddStaffModal } from "./components/AddStaffModal";

export default function PartnerStaff() {
  const {
    staff,
    stats,
    isLoading,
    isDeleting,
    error,
    refetch,
    isAddModalOpen,
    setIsAddModalOpen,
    handleAdd,
    handleDelete,
  } = useStaff();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">
            {t("partner.staff.title")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("partner.staff.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={isLoading}
          >
            <RefreshCw
              size={16}
              className={`mr-1.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Tải lại
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus size={16} className="mr-1.5" />
            Thêm nhân viên
          </Button>
        </div>
      </div>

      {isLoading ? (
        <PageLoading message={t("partner.staff.loadingTitle")} />
      ) : error ? (
        <ErrorState
          variant="server"
          title={t("partner.staff.errorTitle")}
          error={error}
          onRetry={refetch}
        />
      ) : (
        <>
          <div className="mb-8">
            <StaffStats total={stats.total} active={stats.active} />
          </div>
          <StaffList
            staff={staff}
            isDeleting={isDeleting}
            onDelete={handleDelete}
          />
        </>
      )}

      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
