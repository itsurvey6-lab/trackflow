
import {
  X,
  Package,
  UserRound,
  Phone,
  MapPin,
  CalendarDays,
  Truck,
  ClipboardCheck,
} from "lucide-react";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

function OrderDetailsModal({ order, onClose }) {

  const [latestLocation, setLatestLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchLatestLocation() {
      if (!order?.id) {
        setLatestLocation(null);
        return;
      }

      setLocationLoading(true);
      setLocationError("");
      setLatestLocation(null);

      try {
        const token = localStorage.getItem("trackflow_token");

        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/orders/${order.id}/location`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json().catch(() => ({}));

        if (response.status === 404) {
          if (!cancelled) setLatestLocation(null);
          return;
        }

        if (!response.ok) {
          throw new Error(data.message || "Could not load delivery location.");
        }

        const location = data.location || data.data || data;

        if (!cancelled) {
          setLatestLocation(location);
        }
      } catch (error) {
        if (!cancelled) {
          setLocationError(error.message || "Could not load delivery location.");
        }
      } finally {
        if (!cancelled) {
          setLocationLoading(false);
        }
      }
    }

    fetchLatestLocation();

    return () => {
      cancelled = true;
    };
  }, [order?.id]);

  // Listen for live GPS updates for the selected order.
  useEffect(() => {
    if (!order?.id) return;

    const token = localStorage.getItem("trackflow_token");

    if (!token) return;

    const apiUrl =
      import.meta.env.VITE_API_URL || "http://localhost:5000";

    const socket = io(apiUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("order:join", Number(order.id), (reply) => {
        if (reply?.status !== "success") {
          console.error("Admin could not join order room:", reply?.message);
        } else {
          console.log(`Admin joined live tracking for order ${order.id}`);
        }
      });
    });

    socket.on("location:updated", (data) => {
      const updatedOrderId = data?.orderId ?? data?.order_id;

      if (
        String(updatedOrderId) === String(order.id) &&
        data?.location
      ) {
        setLatestLocation(data.location);
        setLocationError("");
        setLocationLoading(false);

        console.log("Admin received live GPS update:", data.location);
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Admin live tracking connection failed:", error.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [order?.id]);

  
  const [orderHistory, setOrderHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchOrderHistory() {
      if (!order?.id) {
        setOrderHistory([]);
        return;
      }

      setHistoryLoading(true);
      setHistoryError("");
      setOrderHistory([]);

      try {
        const token = localStorage.getItem("trackflow_token");
        const apiUrl =
          import.meta.env.VITE_API_URL || "http://localhost:5000";

        const response = await fetch(
          `${apiUrl}/api/orders/${order.id}/history`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.message || "Could not load order history."
          );
        }

        if (!cancelled) {
          setOrderHistory(
            Array.isArray(data.history) ? data.history : []
          );
        }
      } catch (error) {
        if (!cancelled) {
          setHistoryError(
            error.message || "Could not load order history."
          );
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    }

    fetchOrderHistory();

    return () => {
      cancelled = true;
    };
  }, [order?.id]);



  if (!order) return null;

  const statusStyles = {
    Pending: "bg-amber-50 text-amber-700",
    "In Transit": "bg-blue-50 text-blue-700",
    Delivered: "bg-emerald-50 text-emerald-700",
  };

  
const details = [
  {
    label: "Customer Name",
    value: order.customerName || "Not provided",
    icon: UserRound,
  },
  {
    label: "Sender Phone",
    value: order.sender_phone || order.phone || "Not provided",
    icon: Phone,
  },
  {
    label: "Pickup Address",
    value: order.pickup_address || order.pickupAddress || "Not provided",
    icon: MapPin,
  },
  {
    label: "Recipient Name",
    value: order.recipient_name || "Not provided",
    icon: UserRound,
  },
  {
    label: "Recipient Phone",
    value: order.recipient_phone || "Not provided",
    icon: Phone,
  },
  {
    label: "Destination",
    value: order.dropoff_address || order.destination || "Not provided",
    icon: MapPin,
  },
  {
    label: "Package Description",
    value: order.package_description || order.packageDescription || "Not provided",
    icon: Package,
  },
  {
    label: "Special Instructions",
    value: order.special_instructions || "Not provided",
    icon: Package,
  },
  {
    label: "Order Date",
    value: order.created_at
      ? new Date(order.created_at).toLocaleDateString()
      : order.date || "Not provided",
    icon: CalendarDays,
  },

  
  {
    label: "Assigned Delivery Agent",
    value: order.assignedAgentName || "Not assigned",
    icon: Truck,
  },

];


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Shipment details
            </p>
            <h2
              id="order-details-title"
              className="mt-1 text-xl font-bold text-slate-900"
            >
              {order.id}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close order details"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white p-3 text-blue-600 shadow-sm">
                <Truck size={22} />
              </div>

              
                <div>
                  <p className="text-sm text-slate-500">Current status</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Shipment {order.id}
                  </p>
                </div>

            </div>

            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                statusStyles[order.status] ||
                "bg-slate-100 text-slate-600"
              }`}
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
          {details.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
                <Icon size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {label}
                </p>
                <p className="mt-1 break-words text-sm font-medium text-slate-800">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Latest Delivery Location */}
        <div className="border-t border-slate-100 px-6 py-5">
          <div className="mb-3 flex items-center gap-2">
            <MapPin size={19} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900">
              Latest Delivery Location
            </h3>
          </div>

          {locationLoading ? (
            <p className="text-sm text-slate-500">
              Loading latest location...
            </p>
          ) : locationError ? (
            <p className="text-sm text-red-600">{locationError}</p>
          ) : latestLocation &&
            latestLocation.latitude != null &&
            latestLocation.longitude != null ? (
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                <span className="font-medium">Latitude:</span>{" "}
                {latestLocation.latitude}
              </p>

              <p className="mt-1 text-sm text-slate-700">
                <span className="font-medium">Longitude:</span>{" "}
                {latestLocation.longitude}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Last updated:{" "}
                {latestLocation.recorded_at
                  ? new Date(latestLocation.recorded_at).toLocaleString()
                  : "Timestamp unavailable"}
              </p>

              <a
                href={`https://www.google.com/maps?q=${latestLocation.latitude},${latestLocation.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline"
              >
                View on Google Maps
              </a>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No delivery location has been recorded for this order yet.
            </p>
          )}
        </div>


        
        {/* Order History */}
        <div className="border-t border-slate-100 px-6 py-5">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck size={19} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900">
              Order History
            </h3>
          </div>

          {historyLoading ? (
            <p className="text-sm text-slate-500">
              Loading order history...
            </p>
          ) : historyError ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {historyError}
            </p>
          ) : orderHistory.length === 0 ? (
            <p className="text-sm text-slate-500">
              No history records are available for this order yet.
            </p>
          ) : (
            <div className="space-y-4">
              {orderHistory.map((event, index) => {
                const statusLabels = {
                  placed: "Pending",
                  picked_up: "Picked Up",
                  in_transit: "In Transit",
                  delivered: "Delivered",
                  cancelled: "Cancelled",
                };

                const formatStatus = (status) =>
                  statusLabels[status] ||
                  (status
                    ? status.replaceAll("_", " ")
                    : "Unknown");

                return (
                  <div
                    key={event.id ?? index}
                    className="flex gap-3"
                  >
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-blue-500" />
                      {index < orderHistory.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-slate-200" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pb-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {event.old_status
                          ? `${formatStatus(event.old_status)} → ${formatStatus(event.new_status)}`
                          : formatStatus(event.new_status)}
                      </p>

                      {event.note && (
                        <p className="mt-1 break-words text-sm text-slate-600">
                          {event.note}
                        </p>
                      )}

                      {event.changed_by_name && (
                        <p className="mt-1 text-xs text-slate-500">
                          Updated by {event.changed_by_name}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-slate-400">
                        {event.created_at
                          ? new Date(event.created_at).toLocaleString()
                          : "Timestamp unavailable"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsModal;
