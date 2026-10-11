import { toast } from "sonner";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Info,
  Smile,
  Bell,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { useTranslation } from "react-i18next";

type NotificationType = "success" | "info" | "warning" | "error" | "custom";

interface NotificationConfig {
  type?: NotificationType;
  title: string;
  description?: string;
  duration?: number;
}

const getIcon = (type: NotificationType) => {
  switch (type) {
    case "success":
      return <CheckCircle size={20} className="text-green-500" />;
    case "info":
      return <Info size={20} className="text-blue-500" />;
    case "warning":
      return <AlertCircle size={20} className="text-amber-500" />;
    case "error":
      return <XCircle size={20} className="text-red-500" />;
    case "custom":
    default:
      return <Smile size={20} className="text-blue-500" />;
  }
};

export const useNotification = () => {
  const openNotification = (config: NotificationConfig) => {
    const { type = "custom", title, description, duration = 4500 } = config;

    const icon = getIcon(type);

    toast(title, {
      description,
      duration,
      icon,
    });
  };

  const openSuccessNotification = (message: string, description?: string) => {
    toast.success(message, {
      description,
      icon: <CheckCircle size={20} />,
    });
  };

  const openErrorNotification = (message: string, description?: string) => {
    toast.error(message, {
      description,
      icon: <XCircle size={20} />,
    });
  };

  const openWarningNotification = (message: string, description?: string) => {
    toast(message, {
      description,
      icon: <AlertCircle size={20} className="text-amber-500" />,
    });
  };

  const openInfoNotification = (message: string, description?: string) => {
    toast.info(message, {
      description,
      icon: <Info size={20} />,
    });
  };

  return {
    openNotification,
    openSuccessNotification,
    openErrorNotification,
    openWarningNotification,
    openInfoNotification,
  };
};

// Demo component for testing notifications
export function NotificationDemo() {
  const { t } = useTranslation();
  const { openNotification, openSuccessNotification, openErrorNotification, openWarningNotification, openInfoNotification } = useNotification();

  const handleCustomNotification = () => {
    openNotification({
      title: t("shared.notificationDemo.customTitle"),
      description: t("shared.notificationDemo.customDescription"),
      type: "custom",
    });
  };

  const handleSuccessNotification = () => {
    openSuccessNotification(
      t("shared.notificationDemo.successTitle"),
      t("shared.notificationDemo.successDescription")
    );
  };

  const handleErrorNotification = () => {
    openErrorNotification(
      t("shared.notificationDemo.errorTitle"),
      t("shared.notificationDemo.errorDescription")
    );
  };

  const handleWarningNotification = () => {
    openWarningNotification(
      t("shared.notificationDemo.warningTitle"),
      t("shared.notificationDemo.warningDescription")
    );
  };

  const handleInfoNotification = () => {
    openInfoNotification(
      t("shared.notificationDemo.infoTitle"),
      t("shared.notificationDemo.infoDescription")
    );
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell size={20} className="text-blue-600" />
        <h3 className="text-lg font-semibold">Notification Examples</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Button
          onClick={handleCustomNotification}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          Custom Notification
        </Button>

        <Button
          onClick={handleSuccessNotification}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          Success Notification
        </Button>

        <Button
          onClick={handleErrorNotification}
          className="bg-red-500 hover:bg-red-600 text-white"
        >
          Error Notification
        </Button>

        <Button
          onClick={handleWarningNotification}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          Warning Notification
        </Button>

        <Button
          onClick={handleInfoNotification}
          className="bg-blue-400 hover:bg-blue-500 text-white"
        >
          Info Notification
        </Button>
      </div>
    </div>
  );
}

export default NotificationDemo;
