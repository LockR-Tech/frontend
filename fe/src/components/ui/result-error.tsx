import { XCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ErrorResultProps {
  title?: string;
  subTitle?: string;
  onGoHome?: () => void;
  onRetry?: () => void;
  errorDetails?: React.ReactNode;
}

export function ErrorResult({
  title = "Gửi thông tin thất bại",
  subTitle = "Vui lòng kiểm tra và sửa đổi thông tin sau trước khi gửi lại.",
  onGoHome,
  onRetry,
  errorDetails,
}: ErrorResultProps) {
  const navigate = useNavigate();

  const defaultErrorDetails = (
    <div className="mt-4 text-left max-w-md mx-auto">
      <p className="font-medium text-gray-900 mb-3">Thông tin bạn gửi có các lỗi sau:</p>
      <div className="space-y-2">
        <div className="flex items-start gap-2 text-red-600">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          <span className="text-sm">
            Thông tin tài khoản chưa được xác thực.{" "}
            <a href="#" className="text-blue-600 hover:text-blue-800 underline">
              Xác thực ngay →
            </a>
          </span>
        </div>
        <div className="flex items-start gap-2 text-red-600">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          <span className="text-sm">
            Tài khoản chưa đủ điều kiện để thực hiện thao tác này.{" "}
            <a href="#" className="text-blue-600 hover:text-blue-800 underline">
              Nâng cấp tài khoản →
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
      
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500 mb-6 max-w-md">{subTitle}</p>

      {errorDetails || defaultErrorDetails}

      <div className="flex gap-3 mt-8">
        <Button
          onClick={onGoHome || (() => navigate("/admin/dashboard"))}
          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Quay lại trang chủ
        </Button>
        <Button
          onClick={onRetry || (() => navigate("/"))}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RotateCcw size={16} />
          Thử lại
        </Button>
      </div>
    </div>
  );
}

export default ErrorResult;
