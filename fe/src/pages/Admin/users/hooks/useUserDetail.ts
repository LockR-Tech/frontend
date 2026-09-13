import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { isMockEnabled, mockDelay } from "~/hooks/useMockData";
import { apiGet } from "~/utils/api";
import type { AdminUserResponse } from "~/types";

interface UserDetail extends AdminUserResponse {
  phoneNumber?: string;
  lastLogin?: string;
  orderCount?: number;
  totalSpent?: number;
}

const mockUserDetails: Record<string, UserDetail> = {
  "1": {
    id: 1,
    email: "user@example.com",
    name: "Nguyễn Văn A",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nguyen",
    provider: "GOOGLE",
    emailVerified: true,
    enabled: true,
    roles: ["USER"],
    createdAt: "2024-01-15T10:30:00",
    updatedAt: "2024-01-20T14:45:00",
    phoneNumber: "0901234567",
    lastLogin: "2024-01-20T14:45:00",
    orderCount: 5,
    totalSpent: 950000,
  },
  "2": {
    id: 2,
    email: "staff@example.com",
    name: "Trần Thị B",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tran",
    provider: "LOCAL",
    emailVerified: true,
    enabled: true,
    roles: ["STAFF", "USER"],
    createdAt: "2024-01-10T08:00:00",
    updatedAt: "2024-01-18T16:30:00",
    phoneNumber: "0912345678",
    lastLogin: "2024-01-20T09:00:00",
    orderCount: 12,
    totalSpent: 2150000,
  },
  "3": {
    id: 3,
    email: "admin@example.com",
    name: "Lê Văn C",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Le",
    provider: "LOCAL",
    emailVerified: true,
    enabled: true,
    roles: ["ADMIN", "STAFF", "USER"],
    createdAt: "2024-01-01T10:00:00",
    updatedAt: "2024-01-20T15:00:00",
    phoneNumber: "0923456789",
    lastLogin: "2024-01-20T15:00:00",
    orderCount: 0,
    totalSpent: 0,
  },
};

export function useUserDetail(userId: string | undefined) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Always call real API (bypass cache) - set to true for mock
    const USE_MOCK = false;

    if (USE_MOCK) {
      const timer = setTimeout(() => {
        const detail = mockUserDetails[userId];
        setUser(detail || null);
        setIsLoading(false);
      }, mockDelay);

      return () => clearTimeout(timer);
    } else {
      // Real API call with centralized token handling
      const fetchUserDetail = async () => {
        try {
          console.log(`📥 [User Detail] Fetching user ${userId}`);
          const data = await apiGet<{ data: UserDetail }>(
            `/api/admin/users/${userId}`,
          );
          console.log(`✅ [User Detail] Received:`, data);
          setUser(data.data);
        } catch (error) {
          console.error(error);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      };

      fetchUserDetail();
    }
  }, [userId]);

  return {
    user,
    isLoading,
  };
}
