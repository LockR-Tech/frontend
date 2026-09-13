import { useState, useEffect, useCallback } from "react";
import { BoxStatus, LockerStatus } from "~/types/admin/enums";
import { isMockEnabled, mockDelay } from "~/hooks/useMockData";

interface Box {
  id: number;
  number: number;
  status: BoxStatus;
  orderId?: string;
  size: "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE";
}

interface LockerDetail {
  id: number;
  code: string;
  name: string;
  status: LockerStatus;
  storeName: string;
  address: string;
  lastConnected: string;
}

// Mock data
const mockLocker: LockerDetail = {
  id: 1,
  code: "ESP8266_LOCKER_01",
  name: "Tủ KTX A",
  status: LockerStatus.ACTIVE,
  storeName: "Cửa hàng KTX",
  address: "Tầng 1, KTX Khu A, ĐHQG TP.HCM",
  lastConnected: "2 phút trước",
};

const generateMockBoxes = (count: number): Box[] => {
  const boxes: Box[] = [];
  const statuses = [BoxStatus.AVAILABLE, BoxStatus.OCCUPIED, BoxStatus.RESERVED, BoxStatus.MAINTENANCE];
  const sizes: Box["size"][] = ["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"];
  
  for (let i = 1; i <= count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    boxes.push({
      id: i,
      number: i,
      status,
      size: sizes[Math.floor(Math.random() * sizes.length)],
      orderId: status === BoxStatus.OCCUPIED ? `ORD-${1000 + i}` : undefined,
    });
  }
  return boxes;
};

export function useLockerDetail(lockerId: string | undefined) {
  const [locker, setLocker] = useState<LockerDetail | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(() => {
    if (!lockerId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      setLocker(mockLocker);
      setBoxes(generateMockBoxes(20));
      setIsLoading(false);
    }, mockDelay);
  }, [lockerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshBoxes = useCallback(() => {
    setBoxes(generateMockBoxes(20));
  }, []);

  return {
    locker,
    boxes,
    isLoading,
    refreshBoxes,
  };
}
