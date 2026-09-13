import * as React from "react";
import { Construction, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "~/components/ui";
import { useNavigate } from "react-router-dom";

export default function MaintenancePage(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted to-background p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Illustration Area */}
        <div className="relative">
          <div className="flex justify-center items-end gap-8 mb-8">
            {/* Utility Pole */}
            <div className="relative">
              <div className="w-4 h-64 bg-amber-900 rounded-t-sm mx-auto"></div>
              <div className="w-12 h-2 bg-amber-800 absolute top-20 left-1/2 -translate-x-1/2"></div>
              <div className="w-12 h-2 bg-amber-800 absolute top-32 left-1/2 -translate-x-1/2"></div>
              
              {/* Worker on Ladder */}
              <div className="absolute top-12 -right-16">
                <div className="relative">
                  {/* Ladder */}
                  <div className="w-8 h-48 border-l-2 border-r-2 border-gray-400 relative">
                    <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-400"></div>
                    <div className="absolute top-12 left-0 w-full h-0.5 bg-gray-400"></div>
                    <div className="absolute top-20 left-0 w-full h-0.5 bg-gray-400"></div>
                    <div className="absolute top-28 left-0 w-full h-0.5 bg-gray-400"></div>
                    <div className="absolute top-36 left-0 w-full h-0.5 bg-gray-400"></div>
                  </div>
                  {/* Worker climbing */}
                  <div className="absolute top-8 left-1/2 -translate-x-1/2">
                    <div className="w-8 h-8 rounded-full bg-yellow-400"></div>
                    <div className="w-6 h-10 bg-green-600 rounded-sm mx-auto mt-1"></div>
                    <div className="flex gap-1 justify-center mt-1">
                      <div className="w-2 h-8 bg-blue-800 rounded-sm"></div>
                      <div className="w-2 h-8 bg-blue-800 rounded-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Worker on Ground */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-yellow-400 mb-2"></div>
              <div className="w-8 h-12 bg-yellow-500 rounded-sm"></div>
              <div className="flex gap-1 justify-center mt-1">
                <div className="w-2 h-10 bg-blue-900 rounded-sm"></div>
                <div className="w-2 h-10 bg-blue-900 rounded-sm"></div>
              </div>
              
              {/* Toolbox */}
              <div className="w-16 h-8 bg-red-600 rounded-sm mt-4 relative">
                <div className="w-8 h-2 bg-red-700 rounded-full absolute -top-2 left-1/2 -translate-x-1/2"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Construction className="h-12 w-12 text-yellow-500" />
            <h1 className="text-6xl font-bold text-foreground">503</h1>
          </div>
          
          <h2 className="text-3xl font-semibold text-foreground">
            Đang bảo trì hệ thống
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Chúng tôi đang nâng cấp hệ thống để mang đến trải nghiệm tốt hơn cho bạn.
            Vui lòng quay lại sau ít phút.
          </p>

          <div className="text-sm text-muted-foreground bg-muted rounded-lg p-4 max-w-md mx-auto">
            <p className="font-medium mb-2">Thời gian bảo trì dự kiến:</p>
            <p>🕐 Bắt đầu: 02:00 AM</p>
            <p>🕑 Kết thúc: 04:00 AM</p>
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
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </Button>
        </div>

        {/* Footer */}
        <div className="text-sm text-muted-foreground">
          <p>Nếu có thắc mắc, vui lòng liên hệ:</p>
          <a href="mailto:support@laundrylocker.com" className="text-primary hover:underline">
            support@laundrylocker.com
          </a>
        </div>
      </div>
    </div>
  );
}
