import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "~/components/shared/page-header";
import { TechniciansTab } from "../maintenance/TechniciansTab";

export default function TechniciansPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.sidebar.technicians")}
        description={t("admin.technicians.description", {
          defaultValue:
            "Xem trạng thái ca trực, vị trí tọa độ GPS, hiệu suất SLA và phân công thiết bị cho KTV kiosk và drone",
        })}
      />

      <TechniciansTab
        onAssignToTech={(techId, specialty) => {
          if (specialty === "DRONE") {
            navigate(`/admin/maintenance?tab=drone&techId=${techId}`);
          } else {
            navigate(`/admin/maintenance?tab=kiosk&techId=${techId}`);
          }
          toast.info(t("admin.maintenance.toast.showingTechIncidents", { name: `#${techId}` }));
        }}
      />
    </div>
  );
}

