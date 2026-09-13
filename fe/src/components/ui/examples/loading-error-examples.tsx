// Example: Using Loading and Error States in Admin Pages

import React from 'react';
import { 
  PageLoading, 
  TableLoading, 
  CardLoading,
  ErrorState, 
  NetworkError,
  EmptyData 
} from '~/components/ui';
import { useGetAllUsersQuery } from '~/stores/apis/admin';

// Example 1: Full page loading
export function UsersPageExample() {
  const { data, isLoading, error } = useGetAllUsersQuery({ page: 0, size: 10 });

  // Show loading state
  if (isLoading) {
    return <PageLoading message="Đang tải danh sách người dùng..." />;
  }

  // Show error state
  if (error) {
    return (
      <ErrorState
        title="Không thể tải dữ liệu"
        message="Đã có lỗi khi tải danh sách người dùng"
        error={error as Error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Show empty state
  if (!data?.data?.content?.length) {
    return (
      <EmptyData
        title="Chưa có người dùng"
        message="Danh sách người dùng đang trống"
      />
    );
  }

  return <div>{/* Your table here */}</div>;
}

// Example 2: Table loading with inline error
export function UsersTableExample() {
  const { data, isLoading, error } = useGetAllUsersQuery({ page: 0, size: 10 });

  return (
    <div className="space-y-4">
      <h1>Quản lý người dùng</h1>
      
      {/* Inline error */}
      {error && (
        <ErrorState
          variant="inline"
          title="Lỗi tải dữ liệu"
          message="Không thể tải danh sách người dùng"
          onRetry={() => window.location.reload()}
        />
      )}

      {/* Table skeleton */}
      {isLoading ? (
        <TableLoading rows={5} columns={6} />
      ) : (
        <div>{/* Your table */}</div>
      )}
    </div>
  );
}

// Example 3: Dashboard with card loading
export function DashboardExample() {
  const { data, isLoading, error } = useGetAllUsersQuery({ page: 0, size: 10 });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1>Dashboard</h1>
        <CardLoading count={4} />
      </div>
    );
  }

  if (error) {
    return <NetworkError onRetry={() => window.location.reload()} />;
  }

  return <div>{/* Your dashboard */}</div>;
}

// Example 4: Card variant error
export function OrdersPageExample() {
  const { data, isLoading, error } = useGetAllUsersQuery({ page: 0, size: 10 });

  return (
    <div className="space-y-4">
      <h1>Đơn hàng</h1>
      
      {error && (
        <ErrorState
          variant="card"
          title="Không thể tải đơn hàng"
          message="Đã xảy ra lỗi khi tải danh sách đơn hàng. Vui lòng thử lại sau."
          error={error as Error}
          onRetry={() => window.location.reload()}
        />
      )}

      {isLoading ? <TableLoading /> : <div>{/* Orders table */}</div>}
    </div>
  );
}
