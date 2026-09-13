import * as React from "react";
import { ShieldAlert, Home, ArrowLeft, Lock } from "lucide-react";
import { Button } from "~/components/ui";
import { useNavigate } from "react-router-dom";

export default function UnauthorizedPage(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-destructive/10 to-background p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Illustration Area */}
        <div className="relative flex justify-center items-end gap-8 mb-8">
          {/* Barrier/Gate */}
          <div className="relative">
            {/* Gate post */}
            <div className="flex gap-8 items-end">
              <div className="w-4 h-32 bg-gray-700 rounded-t"></div>
              <div className="w-4 h-32 bg-gray-700 rounded-t"></div>
            </div>
            
            {/* Barrier arm */}
            <div className="absolute top-16 left-0 right-0 flex items-center justify-center">
              <div className="w-32 h-6 bg-red-500 rounded-full relative overflow-hidden">
                {/* Diagonal stripes */}
                <div className="absolute inset-0 flex">
                  <div className="w-4 h-full bg-white"></div>
                  <div className="w-4 h-full"></div>
                  <div className="w-4 h-full bg-white"></div>
                  <div className="w-4 h-full"></div>
                  <div className="w-4 h-full bg-white"></div>
                  <div className="w-4 h-full"></div>
                  <div className="w-4 h-full bg-white"></div>
                </div>
              </div>
            </div>

            {/* Lock icon on barrier */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-yellow-400 rounded-full p-2">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
          </div>

          {/* Worker with Stop Gesture */}
          <div className="flex flex-col items-center relative">
            {/* Stop hand */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
              <div className="relative">
                {/* Hand palm */}
                <div className="w-12 h-16 bg-yellow-400 rounded-lg relative">
                  <div className="absolute top-2 left-2 flex gap-0.5">
                    <div className="w-1.5 h-8 bg-yellow-500 rounded-full"></div>
                    <div className="w-1.5 h-10 bg-yellow-500 rounded-full"></div>
                    <div className="w-1.5 h-10 bg-yellow-500 rounded-full"></div>
                    <div className="w-1.5 h-8 bg-yellow-500 rounded-full"></div>
                  </div>
                </div>
                {/* Arm */}
                <div className="w-4 h-12 bg-yellow-500 absolute -bottom-10 left-1/2 -translate-x-1/2"></div>
              </div>
            </div>

            {/* Head with helmet */}
            <div className="relative mt-12">
              <div className="w-12 h-12 rounded-full bg-yellow-400 mb-2 relative">
                {/* Helmet */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-8 bg-orange-500 rounded-t-full"></div>
                
                {/* Serious face */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="flex gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-800"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-800"></div>
                  </div>
                  <div className="w-6 h-0.5 bg-gray-800"></div>
                </div>
              </div>
            </div>
            
            {/* Body */}
            <div className="w-10 h-14 bg-yellow-500 rounded-sm"></div>
            <div className="flex gap-1 justify-center mt-1">
              <div className="w-2.5 h-10 bg-blue-900 rounded-sm"></div>
              <div className="w-2.5 h-10 bg-blue-900 rounded-sm"></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <ShieldAlert className="h-12 w-12 text-red-500" />
            <h1 className="text-6xl font-bold text-foreground">401</h1>
          </div>
          
          <h2 className="text-3xl font-semibold text-foreground">
            Truy cập bị từ chối
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Bạn không có quyền truy cập vào trang này.
            Vui lòng đăng nhập hoặc liên hệ quản trị viên để được cấp quyền.
          </p>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-left">
                <p className="font-medium text-foreground mb-2">Lý do có thể:</p>
                <ul className="text-destructive/80 space-y-1">
                  <li>• Bạn chưa đăng nhập</li>
                  <li>• Phiên đăng nhập đã hết hạn</li>
                  <li>• Tài khoản không có quyền truy cập</li>
                  <li>• Khu vực bị giới hạn truy cập</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
          
          <Button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2"
          >
            <Lock className="h-4 w-4" />
            Đăng nhập
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Trang chủ
          </Button>
        </div>

        {/* Help Section */}
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">Cần hỗ trợ?</p>
          <div className="flex items-center justify-center gap-4">
            <a href="/contact" className="text-primary hover:underline">
              Liên hệ hỗ trợ
            </a>
            <span>•</span>
            <a href="/help" className="text-primary hover:underline">
              Trung tâm trợ giúp
            </a>
            <span>•</span>
            <a href="mailto:support@laundrylocker.com" className="text-primary hover:underline">
              Email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
