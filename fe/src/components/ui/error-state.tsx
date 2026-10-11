import React from 'react';
import { AlertCircle, XCircle, Wifi, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { ServerErrorCard, ServerErrorInline } from './server-error-card';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: any; // Support RTK Query errors, Axios errors, and Error objects
  onRetry?: () => void;
  className?: string;
  variant?: 'default' | 'inline' | 'card' | 'server';
  onClose?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title: titleProp,
  message: messageProp,
  error,
  onRetry,
  className,
  variant = 'default',
  onClose,
}) => {
  const { t } = useTranslation();
  const title = titleProp ?? t('shared.errorState.title');
  const message = messageProp ?? t('shared.errorState.message');
  // Use ServerErrorCard for server errors
  if (variant === 'server') {
    return (
      <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
        <ServerErrorCard
          error={error}
          title={title}
          onRetry={onRetry}
          onClose={onClose}
        />
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{message}</span>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-3 w-3 mr-2" />
              {t('common.retry')}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('rounded-lg border border-destructive/50 bg-destructive/10 p-6', className)}>
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-destructive">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
            {error && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:underline">{t('shared.errorState.details')}</summary>
                <pre className="mt-2 p-2 bg-background rounded border overflow-x-auto">
                  {error.message}
                </pre>
              </details>
            )}
            {onRetry && (
              <Button variant="destructive" size="sm" onClick={onRetry}>
                <RefreshCw className="h-3 w-3 mr-2" />
                {t('common.retry')}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex min-h-[400px] items-center justify-center', className)}>
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <XCircle className="h-16 w-16 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{message}</p>
        </div>
        {error && (
          <details className="text-sm text-muted-foreground text-left">
            <summary className="cursor-pointer hover:underline inline-block">
              {t('shared.errorState.details')}
            </summary>
            <pre className="mt-2 p-4 bg-muted rounded-md overflow-x-auto text-xs">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        {onRetry && (
          <Button onClick={onRetry} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry')}
          </Button>
        )}
      </div>
    </div>
  );
};

interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({ onRetry, className }) => {
  const { t } = useTranslation();
  return (
    <div className={cn('flex min-h-[400px] items-center justify-center', className)}>
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <Wifi className="h-16 w-16 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{t('shared.errorState.networkTitle')}</h2>
          <p className="text-muted-foreground">
            {t('shared.errorState.networkMessage')}
          </p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry')}
          </Button>
        )}
      </div>
    </div>
  );
};

interface EmptyDataProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyData: React.FC<EmptyDataProps> = ({
  title,
  message,
  icon,
  action,
  className,
}) => {
  const { t } = useTranslation();
  return (
    <div className={cn('flex min-h-[400px] items-center justify-center', className)}>
      <div className="text-center space-y-4 max-w-md">
        {icon && <div className="flex justify-center">{icon}</div>}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">{title ?? t('common.noData')}</h2>
          <p className="text-muted-foreground text-sm">{message ?? t('shared.errorState.emptyMessage')}</p>
        </div>
        {action && (
          <Button onClick={action.onClick} className="mt-4">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
};
