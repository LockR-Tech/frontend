import { PageLoading, ErrorState } from "~/components/ui";
import { useTranslation } from "react-i18next";
import { useSettings } from "./hooks/useSettings";
import { ProfileForm } from "./components/ProfileForm";

export default function PartnerSettings() {
  const {
    profile,
    isLoading,
    error,
    refetch,
    handleUpdate,
    isUpdating,
    successMessage,
  } = useSettings();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground">
          {t("partner.settings.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("partner.settings.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <PageLoading message={t("partner.settings.loadingTitle")} />
      ) : error || !profile ? (
        <ErrorState
          variant="server"
          title={t("partner.settings.errorTitle")}
          error={error}
          onRetry={refetch}
        />
      ) : (
        <div className="max-w-2xl">
          <ProfileForm
            profile={profile}
            onSubmit={handleUpdate}
            isLoading={isUpdating}
            successMessage={successMessage}
          />
        </div>
      )}
    </div>
  );
}
