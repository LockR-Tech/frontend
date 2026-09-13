import { PageLoading, ErrorState } from "~/components/ui";
import { useTranslation } from "react-i18next";
import { useNotifications } from "./hooks/useNotifications";
import { NotificationList } from "./components/NotificationList";
import { NotificationFilters } from "./components/NotificationFilters";

export default function PartnerNotifications() {
  const {
    notifications,
    unreadCount,
    filter,
    setFilter,
    isLoading,
    error,
    refetch,
    handleMarkAsRead,
    handleMarkAllAsRead,
  } = useNotifications();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground">
          {t("partner.notifications.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("partner.notifications.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <PageLoading message={t("partner.notifications.loadingTitle")} />
      ) : error ? (
        <ErrorState
          variant="server"
          title={t("partner.notifications.errorTitle")}
          error={error}
          onRetry={refetch}
        />
      ) : (
        <>
          <NotificationFilters
            filter={filter}
            onFilterChange={setFilter}
            unreadCount={unreadCount}
            onMarkAllAsRead={handleMarkAllAsRead}
          />
          <NotificationList
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
          />
        </>
      )}
    </div>
  );
}
