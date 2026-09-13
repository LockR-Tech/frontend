import { Wifi, WifiOff } from "lucide-react";

interface WebSocketIndicatorProps {
  connected: boolean;
  error?: string | null;
}

export function WebSocketIndicator({ connected, error }: WebSocketIndicatorProps) {
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div
        className={`px-3 py-2 rounded-full text-sm flex items-center gap-2 shadow ${
          connected
            ? "bg-green-100 text-green-700"
            : "bg-muted/50 text-muted-foreground"
        }`}
        title={connected ? "Kết nối real-time" : error || "Đang kết nối..."}
      >
        {connected ? (
          <>
            <Wifi size={14} className="text-green-600" />
            Real-time
          </>
        ) : (
          <>
            <WifiOff size={14} className="text-muted-foreground/70" />
            Offline
          </>
        )}
      </div>
    </div>
  );
}
