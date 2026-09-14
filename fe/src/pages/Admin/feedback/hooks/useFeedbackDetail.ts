import { useState, useEffect } from "react";
import { isMockEnabled, mockDelay } from "~/hooks/useMockData";
import { apiGet } from "~/utils/api";
import type { FeedbackItem } from "~/types";

const mockFeedbackDetails: Record<string, FeedbackItem> = {
  "1": {
    id: 1,
    userId: 1,
    userName: "Nguyễn Văn A",
    userEmail: "user1@example.com",
    userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user1",
    type: "PRAISE",
    status: "RESOLVED",
    priority: "LOW",
    subject: "Dịch vụ gửi hàng Kiosk tuyệt vời",
    message:
      "Tôi rất hài lòng với dịch vụ Kiosk thông minh của các bạn. Kiện hàng được bảo quản an toàn, giao diện mở tủ tiện lợi. Thời gian giao nhận Drone cũng nhanh như cam kết. Tôi sẽ tiếp tục sử dụng dịch vụ này.",
    rating: 5,
    orderNumber: "ORD-001",
    storeId: 1,
    storeName: "Smart Hub 1",
    createdAt: "2024-01-15T10:30:00",
    updatedAt: "2024-01-16T14:45:00",
    responseMessage:
      "Cảm ơn quý khách đã tin tưởng chúng tôi. Chúng tôi sẽ tiếp tục cải thiện dịch vụ.",
    respondedBy: "Trần Thị B",
    respondedAt: "2024-01-16T10:00:00",
  },
  "2": {
    id: 2,
    userId: 2,
    userName: "Trần Thị B",
    userEmail: "user2@example.com",
    userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user2",
    type: "COMPLAINT",
    status: "IN_PROGRESS",
    priority: "HIGH",
    subject: "Kiosk bị kẹt mã QR",
    message:
      "Tôi đã gửi kiện hàng vào ngăn số 5 tại Kiosk Quận 1, nhưng mã OTP không mở được khi tôi quay lại. Tôi đã chờ 15 phút và cuối cùng phải liên hệ hỗ trợ. Điều này cần khắc phục sớm.",
    orderNumber: "ORD-002",
    storeId: 2,
    storeName: "Smart Hub Quận 1",
    createdAt: "2024-01-18T15:20:00",
    updatedAt: "2024-01-19T09:00:00",
    responseMessage:
      "Chúng tôi rất xin lỗi về sự cố này. Chúng tôi đang kiểm tra lại cảm biến ô tủ và nâng cấp firmware.",
    respondedBy: "Lê Văn C",
    respondedAt: "2024-01-19T08:30:00",
  },
  "3": {
    id: 3,
    userId: 3,
    userName: "Lê Văn C",
    userEmail: "user3@example.com",
    userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user3",
    type: "FEATURE",
    status: "NEW",
    priority: "MEDIUM",
    subject: "Xin thêm tính năng thuê ô lưu trữ dài hạn",
    message:
      "Tôi muốn yêu cầu thêm tính năng thuê ngăn Kiosk theo tháng hoặc đặt trước định kỳ. Ví dụ, tôi có thể chọn 'mỗi thứ hai và thứ năm' để giao nhận hàng tự động mà không cần đặt chỗ mỗi lần.",
    createdAt: "2024-01-20T11:00:00",
    updatedAt: "2024-01-20T11:00:00",
  },
  "4": {
    id: 4,
    userId: 4,
    userName: "Phạm Thị D",
    userEmail: "user4@example.com",
    userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user4",
    type: "BUG",
    status: "RESOLVED",
    priority: "URGENT",
    subject: "Ứng dụng bị crash khi thanh toán",
    message:
      "Khi tôi cố gắng thanh toán đơn hàng của mình, ứng dụng bị crash. Tôi phải cài đặt lại ứng dụng và thử lại. May mắn là thanh toán đã thành công sau lần thứ hai, nhưng điều này rất nguy hiểm vì tôi không chắc liệu tôi đã thanh toán hay không.",
    rating: 1,
    orderNumber: "ORD-003",
    storeId: 1,
    storeName: "Laundry Store 1",
    createdAt: "2024-01-14T09:30:00",
    updatedAt: "2024-01-17T15:00:00",
    responseMessage:
      "Chúng tôi rất xin lỗi về vấn đề này. Chúng tôi đã xác định và sửa lỗi. Vui lòng cập nhật phiên bản mới nhất của ứng dụng.",
    respondedBy: "Nguyễn Văn A",
    respondedAt: "2024-01-17T14:30:00",
  },
  "5": {
    id: 5,
    userId: 5,
    userName: "Hoàng Văn E",
    userEmail: "user5@example.com",
    userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user5",
    type: "IMPROVEMENT",
    status: "NEW",
    priority: "LOW",
    subject: "Cải thiện giao diện ứng dụng",
    message:
      "Giao diện ứng dụng có thể được cải thiện. Fontsize quá nhỏ trên thiết bị di động, và các nút bấm quá gần nhau. Điều này khiến việc nhấp vào nút đúng trở nên khó khăn.",
    createdAt: "2024-01-19T16:45:00",
    updatedAt: "2024-01-19T16:45:00",
  },
};

export function useFeedbackDetail(feedbackId: string | undefined) {
  const [feedback, setFeedback] = useState<FeedbackItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!feedbackId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Always call real API (bypass cache) - set to true for mock
    const USE_MOCK = false;

    if (USE_MOCK) {
      const timer = setTimeout(() => {
        const detail = mockFeedbackDetails[feedbackId];
        setFeedback(detail || null);
        setIsLoading(false);
      }, mockDelay);

      return () => clearTimeout(timer);
    } else {
      // Real API call with centralized token handling
      const fetchFeedbackDetail = async () => {
        try {
          console.log(`📥 [Feedback Detail] Fetching feedback ${feedbackId}`);
          const data = await apiGet<{ data: FeedbackItem }>(
            `/api/admin/feedbacks/${feedbackId}`,
          );
          console.log(`✅ [Feedback Detail] Received:`, data);
          setFeedback(data.data);
        } catch (error) {
          console.error("❌ [Feedback Detail] Error:", error);
          setFeedback(null);
        } finally {
          setIsLoading(false);
        }
      };

      fetchFeedbackDetail();
    }
  }, [feedbackId]);

  return {
    feedback,
    isLoading,
  };
}
