import { XCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface ErrorResultProps {
  title?: string;
  subTitle?: string;
  onGoHome?: () => void;
  onRetry?: () => void;
  errorDetails?: React.ReactNode;
}

export function ErrorResult({
  title,
  subTitle,
  onGoHome,
  onRetry,
  errorDetails,
}: ErrorResultProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const defaultErrorDetails = (
    <div className="mt-4 text-left max-w-md mx-auto">
      <p className="font-medium text-gray-900 mb-3">{t("shared.resultError.detailsTitle")}</p>
      <div className="space-y-2">
        <div className="flex items-start gap-2 text-red-600">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          <span className="text-sm">
            {t("shared.resultError.notVerified")}{" "}
            <a href="#" className="text-blue-600 hover:text-blue-800 underline">
              {t("shared.resultError.verifyNow")}
            </a>
          </span>
        </div>
        <div className="flex items-start gap-2 text-red-600">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          <span className="text-sm">
            {t("shared.resultError.notEligible")}{" "}
            <a href="#" className="text-blue-600 hover:text-blue-800 underline">
              {t("shared.resultError.upgrade")}
            </a>
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="mb-6">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <XCircle size={48} className="text-red-500" />
        </div>
      </div>
      
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title ?? t("shared.resultError.title")}</h1>
      <p className="text-gray-500 mb-6 max-w-md">{subTitle ?? t("shared.resultError.subtitle")}</p>

      {errorDetails || defaultErrorDetails}

      <div className="flex gap-3 mt-8">
        <Button
          onClick={onGoHome || (() => navigate("/admin/dashboard"))}
          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          {t("shared.resultError.backHome")}
        </Button>
        <Button
          onClick={onRetry || (() => navigate("/"))}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RotateCcw size={16} />
          {t("common.retry")}
        </Button>
      </div>
    </div>
  );
}

export default ErrorResult;
