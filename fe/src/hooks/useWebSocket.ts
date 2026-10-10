import { useEffect, useRef, useCallback, useState } from "react";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { API_BASE_URL } from "@/constants";

// ============================================
// Types
// ============================================

export interface WebSocketNotification {
  id?: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt?: string;
}

export interface OrderUpdateNotification {
  orderId: number;
  orderCode: string;
  status: string;
  previousStatus?: string;
  message?: string;
  timestamp?: string;
}

type MessageHandler<T = unknown> = (message: T) => void;

interface SubscriptionEntry {
  destination: string;
  handler: (message: IMessage) => void;
  /** Subscription STOMP của phiên hiện tại; null khi chưa/mất kết nối */
  stompSub: StompSubscription | null;
}

interface UseWebSocketOptions {
  /** Auto connect on mount */
  autoConnect?: boolean;
  /** Reconnect delay in ms */
  reconnectDelay?: number;
  /** Enable debug logging */
  debug?: boolean;
}

interface UseWebSocketReturn {
  /** Connection state */
  connected: boolean;
  /** Connect to WebSocket server */
  connect: () => void;
  /** Disconnect from WebSocket server */
  disconnect: () => void;
  /**
   * Subscribe to a topic. Gọi được cả trước khi kết nối: subscription được xếp hàng
   * và tự đăng ký (lại) mỗi lần STOMP kết nối. Handle trả về luôn huỷ được.
   */
  subscribe: <T = unknown>(
    destination: string,
    callback: MessageHandler<T>
  ) => StompSubscription | null;
  /** Unsubscribe from a topic */
  unsubscribe: (subscription: StompSubscription) => void;
  /** Send message to destination */
  send: (destination: string, body: unknown) => void;
  /** Error state */
  error: string | null;
}

// ============================================
// Hook
// ============================================

export function useWebSocket(
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const { autoConnect = false, reconnectDelay = 5000, debug = false } = options;

  const clientRef = useRef<Client | null>(null);
  // Sổ đăng ký subscription: giữ cả những subscription xin trước khi STOMP kết nối,
  // để onConnect (kể cả sau khi tự kết nối lại) đăng ký lại toàn bộ.
  const subscriptionsRef = useRef(new Map<string, SubscriptionEntry>());
  const subscriptionSeqRef = useRef(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const log = useCallback(
    (message: string, ...args: unknown[]) => {
      if (debug) {
        console.log(`%c[WebSocket] ${message}`, "color:#8b5cf6", ...args);
      }
    },
    [debug]
  );

  // Gắn một subscription vào phiên STOMP hiện tại (nếu đang kết nối)
  const attach = useCallback(
    (entry: SubscriptionEntry) => {
      const client = clientRef.current;
      if (!client?.connected) return;
      try {
        entry.stompSub = client.subscribe(entry.destination, entry.handler);
        log(`Subscribed to ${entry.destination}`);
      } catch (e) {
        entry.stompSub = null;
        log(`Subscribe failed for ${entry.destination}`, e);
      }
    },
    [log]
  );

  // Initialize STOMP client
  const initClient = useCallback(() => {
    const wsUrl = `${API_BASE_URL}/ws`;

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (str) => {
        if (debug) console.log(`[STOMP] ${str}`);
      },
      // Đọc token mỗi lần (kết nối lại) để dùng access token mới nhất sau khi refresh
      beforeConnect: (stompClient) => {
        const token = localStorage.getItem("accessToken")?.replace(/\s/g, "");
        stompClient.connectHeaders = token
          ? { Authorization: `Bearer ${token}` }
          : {};
      },
      onConnect: () => {
        log("Connected to WebSocket server");
        // Phiên mới: subscription cũ đã mất, đăng ký lại tất cả
        subscriptionsRef.current.forEach((entry) => attach(entry));
        setConnected(true);
        setError(null);
      },
      onDisconnect: () => {
        log("Disconnected from WebSocket server");
        setConnected(false);
      },
      onWebSocketClose: () => {
        subscriptionsRef.current.forEach((entry) => {
          entry.stompSub = null;
        });
        setConnected(false);
      },
      onStompError: (frame) => {
        const errorMsg = frame.headers?.message || "Unknown STOMP error";
        log("STOMP error:", errorMsg);
        setError(errorMsg);
      },
      onWebSocketError: (event) => {
        log("WebSocket error:", event);
        setError("WebSocket connection error");
      },
    });

    return client;
  }, [reconnectDelay, debug, log, attach]);

  // Connect
  const connect = useCallback(() => {
    if (clientRef.current?.active) {
      log("Already active");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      log("No access token, skipping WebSocket connection");
      return;
    }

    if (!clientRef.current) {
      clientRef.current = initClient();
    }

    log("Connecting to WebSocket...");
    clientRef.current.activate();
  }, [initClient, log]);

  // Disconnect: tắt cả khi đang kết nối dở / chờ kết nối lại, không chỉ khi đã connected
  const disconnect = useCallback(() => {
    const client = clientRef.current;
    if (client?.active) {
      log("Disconnecting from WebSocket...");
      void client.deactivate();
    }
    subscriptionsRef.current.forEach((entry) => {
      entry.stompSub = null;
    });
    setConnected(false);
  }, [log]);

  // Subscribe: luôn trả về handle; nếu chưa kết nối thì xếp hàng chờ onConnect
  const subscribe = useCallback(
    <T = unknown>(
      destination: string,
      callback: MessageHandler<T>
    ): StompSubscription => {
      subscriptionSeqRef.current += 1;
      const key = `sub-${subscriptionSeqRef.current}`;
      const entry: SubscriptionEntry = {
        destination,
        stompSub: null,
        handler: (message: IMessage) => {
          try {
            const body = JSON.parse(message.body) as T;
            log(`Received message from ${destination}:`, body);
            callback(body);
          } catch (e) {
            console.error("Failed to parse WebSocket message:", e);
          }
        },
      };
      subscriptionsRef.current.set(key, entry);
      if (clientRef.current?.connected) {
        attach(entry);
      } else {
        log(`Queued subscription to ${destination} until connected`);
      }

      return {
        id: key,
        unsubscribe: () => {
          subscriptionsRef.current.delete(key);
          const stompSub = entry.stompSub;
          entry.stompSub = null;
          if (stompSub && clientRef.current?.connected) {
            try {
              stompSub.unsubscribe();
            } catch {
              // phiên đã đóng — không còn gì để huỷ
            }
          }
        },
      };
    },
    [log, attach]
  );

  // Unsubscribe
  const unsubscribe = useCallback(
    (subscription: StompSubscription) => {
      if (subscription) {
        log(`Unsubscribing from ${subscription.id}`);
        subscription.unsubscribe();
      }
    },
    [log]
  );

  // Send message
  const send = useCallback(
    (destination: string, body: unknown) => {
      if (!clientRef.current?.connected) {
        log("Cannot send: not connected");
        return;
      }

      log(`Sending to ${destination}:`, body);
      clientRef.current.publish({
        destination,
        body: JSON.stringify(body),
      });
    },
    [log]
  );

  // Auto connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    send,
    error,
  };
}

// ============================================
// Partner-specific WebSocket Hook
// ============================================

interface UsePartnerWebSocketOptions {
  /** Callback when order status changes */
  onOrderUpdate?: (notification: OrderUpdateNotification) => void;
  /** Callback for any notification */
  onNotification?: (notification: WebSocketNotification) => void;
  /** Enable debug logging */
  debug?: boolean;
}

export function usePartnerWebSocket(options: UsePartnerWebSocketOptions = {}) {
  const { onOrderUpdate, onNotification, debug = false } = options;

  const { connected, connect, disconnect, subscribe, error } = useWebSocket({
    autoConnect: false,
    debug,
  });

  const subscriptionsRef = useRef<StompSubscription[]>([]);

  // Subscribe to partner channels when connected
  useEffect(() => {
    if (!connected) return;

    const userId = localStorage.getItem("userId");
    if (!userId) return;

    // Subscribe to user-specific notifications
    const userNotifSub = subscribe<WebSocketNotification>(
      `/user/${userId}/queue/notifications`,
      (notification) => {
        if (debug) {
          console.log("[Partner WS] User notification:", notification);
        }
        onNotification?.(notification);

        // Check if it's an order update - trigger refetch for order-related notifications
        if (
          notification.type === "ORDER_UPDATE" ||
          notification.type === "ORDER_STATUS_CHANGED" ||
          notification.type === "ORDER_STATUS"
        ) {
          // For order status notifications, we refetch even without full data
          // because the notification only contains title/message, not full order details
          onOrderUpdate?.({
            orderId: 0, // Will trigger refetch
            orderCode: "",
            status: notification.type,
            message: notification.message,
          });
        }
      }
    );

    // Subscribe to broadcast notifications (optional)
    const broadcastSub = subscribe<WebSocketNotification>(
      "/topic/notifications",
      (notification) => {
        if (debug) {
          console.log("[Partner WS] Broadcast notification:", notification);
        }
        onNotification?.(notification);
      }
    );

    // Subscribe to partner-specific order updates
    const orderUpdateSub = subscribe<OrderUpdateNotification>(
      `/user/${userId}/queue/orders`,
      (update) => {
        if (debug) {
          console.log("[Partner WS] Order update:", update);
        }
        onOrderUpdate?.(update);
      }
    );

    // Store subscriptions for cleanup
    subscriptionsRef.current = [userNotifSub, broadcastSub, orderUpdateSub].filter(
      (s): s is StompSubscription => s !== null
    );

    return () => {
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
      subscriptionsRef.current = [];
    };
  }, [connected, subscribe, onOrderUpdate, onNotification, debug]);

  return {
    connected,
    connect,
    disconnect,
    error,
  };
}

export default useWebSocket;
