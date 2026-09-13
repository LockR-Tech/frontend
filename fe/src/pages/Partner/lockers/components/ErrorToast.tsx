import { AlertTriangle, X } from "lucide-react";

interface ErrorToastProps {
  message: string | null;
  onClose: () => void;
}

export function ErrorToast({ message, onClose }: ErrorToastProps) {
  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 text-red-400 hover:text-red-600">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
