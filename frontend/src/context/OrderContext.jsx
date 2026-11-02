import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import { io } from "socket.io-client";

const OrderContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function mapApiOrder(order) {
  const statusMap = {
    placed: "Pending",
    picked_up: "Picked Up",
    in_transit: "In Transit",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  return {
    ...order,
    id: String(order.id),
    customerName: order.customer_name || "Customer",
    destination: order.dropoff_address || "Not specified",
    
    assignedAgentName: order.assigned_agent_name || null,
    assignedAgentId: order.assigned_agent_id ?? null,

    date: order.created_at
      ? new Date(order.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—",
    status: statusMap[order.status] || order.status,
  };
}

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [notifications, setNotifications] = useState([]);

  const refreshOrders = useCallback(async () => {
    const token = localStorage.getItem("trackflow_token");

    if (!token) {
      setOrders([]);
      setOrdersError("Please sign in to view orders.");
      setIsLoadingOrders(false);
      return;
    }

    setIsLoadingOrders(true);
    setOrdersError("");

    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      
      if (response.status === 401) {
        localStorage.removeItem("trackflow_token");
        localStorage.removeItem("trackflow_user");

        setOrders([]);
        setOrdersError("");
        setIsLoadingOrders(false);

        window.alert("Your session has expired. Please sign in again.");
        window.location.replace("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load orders.");
      }


      if (!Array.isArray(data.orders)) {
        throw new Error("Unexpected orders response from server.");
      }

      setOrders(data.orders.map(mapApiOrder));
    } catch (error) {
      setOrdersError(error.message || "Could not load orders.");
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  
  
useEffect(() => {
  refreshOrders();

  let socket;

  const connectSocket = () => {
    const token = localStorage.getItem("trackflow_token");

    if (!token) {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      return;
    }

    if (socket) {
      socket.disconnect();
    }

    socket = io(API_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("TrackFlow real-time connection established.");
    });

    socket.on("connect_error", (error) => {
      console.error("TrackFlow Socket.IO connection error:", error.message);
    });

    socket.on("orders:changed", () => {
      refreshOrders();
    });

    socket.on("notification:new", (notification) => {
      setNotifications((previous) => [
        {
          ...notification,
          id: `${Date.now()}-${Math.random()}`,
          receivedAt: new Date().toISOString(),
          read: false,
        },
        ...previous,
      ]);

      window.dispatchEvent(
        new CustomEvent("trackflow-notification", {
          detail: notification,
        })
      );
    });
  };

  connectSocket();

  const handleAuthChanged = () => {
    refreshOrders();
    connectSocket();
  };

  window.addEventListener("trackflow-auth-changed", handleAuthChanged);

  return () => {
    window.removeEventListener("trackflow-auth-changed", handleAuthChanged);

    if (socket) {
      socket.disconnect();
    }
  };
}, [refreshOrders]);




  return (
    <OrderContext.Provider
      value={{
        orders,
        setOrders,
        refreshOrders,
        isLoadingOrders,
        ordersError,
        notifications,
        setNotifications,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);

  if (!context) {
    throw new Error("useOrders must be used inside OrderProvider");
  }

  return context;
}
