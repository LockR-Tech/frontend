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
  /** Subscribe to a topic */
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
      onConnect: () => {
        log("Connected to WebSocket server");
        setConnected(true);
        setError(null);
      },
      onDisconnect: () => {
        log("Disconnected from WebSocket server");
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
  }, [reconnectDelay, debug, log]);

  // Connect
  const connect = useCallback(() => {
    if (clientRef.current?.connected) {
      log("Already connected");
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

    // Add auth header
    clientRef.current.connectHeaders = {
      Authorization: `Bearer ${token}`,
    };

    log("Connecting to WebSocket...");
    clientRef.current.activate();
  }, [initClient, log]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (clientRef.current?.connected) {
      log("Disconnecting from WebSocket...");
      clientRef.current.deactivate();
    }
  }, [log]);

  // Subscribe to a destination
  const subscribe = useCallback(
    <T = unknown>(
      destination: string,
      callback: MessageHandler<T>
    ): StompSubscription | null => {
      if (!clientRef.current?.connected) {
        log("Cannot subscribe: not connected");
        return null;
      }

      log(`Subscribing to ${destination}`);
      return clientRef.current.subscribe(destination, (message: IMessage) => {
        try {
          const body = JSON.parse(message.body) as T;
          log(`Received message from ${destination}:`, body);
          callback(body);
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      });
    },
    [log]
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
