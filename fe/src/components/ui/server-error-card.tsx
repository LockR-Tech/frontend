import React from 'react';
import { XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ServerErrorCardProps {
  error?: any;
  title?: string;
  onRetry?: () => void;
  onClose?: () => void;
  className?: string;
}

export const ServerErrorCard: React.FC<ServerErrorCardProps> = ({
  error,
  title = 'Server Error',
  onRetry,
  onClose,
  className,
}) => {
  const [isMinimized, setIsMinimized] = React.useState(false);

  // Extract error details
  const getErrorDetails = () => {
    if (!error) return null;

    // RTK Query error
    if ('status' in error) {
      return {
        status: error.status,
        message: error.data?.message || error.error || 'Unknown error',
        data: error.data,
      };
    }

    // Axios/Fetch error
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.data?.message || error.message,
        data: error.response.data,
      };
    }

    // Generic Error object
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
      };
    }

    // Plain object
    return {
      message: error.message || JSON.stringify(error),
    };
  };

  const errorDetails = getErrorDetails();

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* macOS-style window controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-200 dark:bg-gray-700">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer transition-colors"
              title="Close"
            />
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 cursor-pointer transition-colors"
              title="Minimize"
            />
            <button
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 cursor-pointer transition-colors"
              title="Maximize"
            />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
            <XCircle className="w-4 h-4 text-red-500" />
            {title}
          </div>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Error content */}
        {!isMinimized && (
          <div className="p-6 bg-white dark:bg-gray-900">
            <div className="space-y-4">
              {/* Status code badge */}
              {errorDetails?.status && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-semibold">
                    Status: {errorDetails.status}
                  </span>
                </div>
              )}

              {/* Error message */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Error Message
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words">
                      {errorDetails?.message || 'An unknown error occurred'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error data/response */}
              {errorDetails?.data && (
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-2">
                    <span className="transform group-open:rotate-90 transition-transform">▶</span>
                    Server Response
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-md overflow-x-auto text-xs text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                    {JSON.stringify(errorDetails.data, null, 2)}
                  </pre>
                </details>
              )}

              {/* Stack trace */}
              {errorDetails?.stack && (
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-2">
                    <span className="transform group-open:rotate-90 transition-transform">▶</span>
                    Stack Trace
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-md overflow-x-auto text-xs text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 font-mono">
                    {errorDetails.stack}
                  </pre>
                </details>
              )}

              {/* Actions */}
              {onRetry && (
                <div className="pt-2">
                  <Button
                    onClick={onRetry}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Thử lại
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Compact variant for inline errors
interface ServerErrorInlineProps {
  error?: any;
  onRetry?: () => void;
  className?: string;
}

export const ServerErrorInline: React.FC<ServerErrorInlineProps> = ({
  error,
  onRetry,
  className,
}) => {
  const getErrorMessage = () => {
    if (!error) return 'Unknown error';
    if ('status' in error) return error.data?.message || error.error;
    if (error.response) return error.response.data?.message || error.message;
    if (error instanceof Error) return error.message;
    return error.message || JSON.stringify(error);
  };

  const getStatusCode = () => {
    if (!error) return null;
    if ('status' in error) return error.status;
    if (error.response) return error.response.status;
    return null;
  };

  const statusCode = getStatusCode();
  const message = getErrorMessage();

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg',
        className
      )}
    >
      <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {statusCode && (
            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 rounded text-xs font-semibold">
              {statusCode}
            </span>
          )}
          <span className="text-sm font-semibold text-red-800 dark:text-red-300">
            Server Error
          </span>
        </div>
        <p className="text-sm text-red-700 dark:text-red-400 break-words">{message}</p>
      </div>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="ghost"
          size="sm"
          className="flex-shrink-0 text-red-700 hover:text-red-800 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
