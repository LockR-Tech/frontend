// Example: Using ServerErrorCard component

import React from 'react';
import { ServerErrorCard, ServerErrorInline } from '~/components/ui';
import { useGetAllUsersQuery } from '~/stores/apis/admin';

// Example 1: Full ServerErrorCard with RTK Query error
export function UsersPageWithServerError() {
  const { data, isLoading, error } = useGetAllUsersQuery({ page: 0, size: 10 });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <ServerErrorCard
          error={error}
          title="Failed to load users"
          onRetry={() => window.location.reload()}
          onClose={() => window.history.back()}
        />
      </div>
    );
  }

  return <div>{/* Your content */}</div>;
}

// Example 2: Inline error in a page
export function OrdersPageWithInlineError() {
  const { data, isLoading, error } = useGetAllUsersQuery({ page: 0, size: 10 });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>

      {/* Show inline error above content */}
      {error && (
        <ServerErrorInline
          error={error}
          onRetry={() => window.location.reload()}
        />
      )}

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>{/* Your table/content */}</div>
      )}
    </div>
  );
}

// Example 3: Axios error
export function ExampleWithAxiosError() {
  const axiosError = {
    response: {
      status: 404,
      data: {
        message: 'Resource not found',
        error: 'NOT_FOUND',
        timestamp: '2024-01-24T10:00:00Z',
      },
    },
    message: 'Request failed with status code 404',
  };

  return (
    <ServerErrorCard
      error={axiosError}
      title="API Error"
      onRetry={() => console.log('Retry')}
    />
  );
}

// Example 4: Generic Error object
export function ExampleWithGenericError() {
  const genericError = new Error('Connection timeout after 30 seconds');

  return (
    <ServerErrorCard
      error={genericError}
      title="Network Error"
      onRetry={() => console.log('Retry')}
    />
  );
}

// Example 5: RTK Query error with detailed response
export function ExampleWithRTKQueryError() {
  const rtkError = {
    status: 400,
    data: {
      message: 'Validation failed',
      errors: {
        email: 'Email is already taken',
        password: 'Password must be at least 8 characters',
      },
      timestamp: '2024-01-24T10:00:00Z',
    },
  };

  return (
    <ServerErrorCard
      error={rtkError}
      title="Validation Error"
      onRetry={() => console.log('Retry')}
    />
  );
}

// Example 6: Custom error object
export function ExampleWithCustomError() {
  const customError = {
    status: 500,
    data: {
      message: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
      requestId: 'req-12345-67890',
      details: {
        service: 'user-service',
        operation: 'createUser',
        reason: 'Database connection failed',
      },
    },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Full card */}
      <ServerErrorCard
        error={customError}
        title="Service Error"
        onRetry={() => console.log('Retry')}
      />

      {/* Inline version */}
      <ServerErrorInline
        error={customError}
        onRetry={() => console.log('Retry')}
      />
    </div>
  );
}
