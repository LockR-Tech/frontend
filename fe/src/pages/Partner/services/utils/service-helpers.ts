export const getCategoryLabel = (category: string): string => {
  switch (category) {
    case "LAUNDRY":
      return "Giặt ủi";
    case "STORAGE":
      return "Gửi đồ";
    default:
      return category;
  }
};

export const getCategoryBadge = (category: string): string => {
  switch (category) {
    case "LAUNDRY":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "STORAGE":
      return "bg-purple-100 text-purple-700 border-purple-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};
