import { useTranslation } from "react-i18next";
import { RefreshCw, Search } from "lucide-react";
import { useServices } from "./hooks/useServices";
import { ServiceStats } from "./components/ServiceStats";
import { ServiceList } from "./components/ServiceList";
import { CategoryFilter } from "./components/CategoryFilter";
import { ServiceDetailModal } from "./components/ServiceDetailModal";
import { PageLoading, ErrorState } from "~/components/ui";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export default function PartnerServices() {
  const {
    filteredServices,
    filterCategory,
    setFilterCategory,
    searchQuery,
    setSearchQuery,
    stats,
    isLoading,
    error,
    refetch,
    selectedService,
    isDetailOpen,
    setIsDetailOpen,
    handleViewDetail,
  } = useServices();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">
            {t("partner.services.title")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("partner.services.subtitle")}
          </p>
        </div>
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
      </div>

      {isLoading ? (
        <PageLoading message={t("partner.services.loadingTitle")} />
      ) : error ? (
        <ErrorState
          variant="server"
          title={t("partner.services.errorTitle")}
          error={error}
          onRetry={refetch}
        />
      ) : (
        <>
          <div className="mb-8">
            <ServiceStats stats={stats} />
          </div>

          {/* Filters row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
            <CategoryFilter
              value={filterCategory}
              onChange={setFilterCategory}
            />
            <div className="relative w-full sm:w-72">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70"
              />
              <Input
                placeholder="Tìm theo tên dịch vụ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ServiceList
            services={filteredServices}
            onViewDetail={handleViewDetail}
          />
        </>
      )}

      <ServiceDetailModal
        service={selectedService}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
