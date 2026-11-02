import { useMemo, useState, useRef, useEffect } from "react";

import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Package,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import { useOrders } from "../context/OrderContext";
import CreateOrderForm from "../components/Order/CreateOrderForm";
import OrderDetailsModal from "../components/Order/OrderDetailsModal";
import EditOrderModal from "../components/Order/EditOrderModal";

// ==================================================
// SECTION 1: ORDER STATUS STYLES AND FILTER OPTIONS
// ==================================================

const statusStyles = {
  Pending: "bg-amber-50 text-amber-700",
  "Picked Up": "bg-violet-50 text-violet-700",
  "In Transit": "bg-blue-50 text-blue-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-red-50 text-red-700",
};

const statusOptions = [
  "All Statuses",
  "Pending",
  "Picked Up",
  "In Transit",
  "Delivered",
  "Cancelled",
];




// ==================================================
// SECTION 2: ORDERS PAGE AND USER ROLE
// ==================================================

function Orders() {
  const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

  const user = JSON.parse(
    localStorage.getItem("trackflow_user") || "null"
  );

  const isAdmin = user?.role === "admin";
  const isCustomer = user?.role === "customer";
  const isDeliveryAgent = user?.role === "delivery_agent";

  const {
    orders,
    refreshOrders,
    isLoadingOrders,
    ordersError,
  } = useOrders();

  // ==================================================
  // SECTION 3: COMPONENT STATE
  // ==================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState("All Statuses");

  const [showCreateModal, setShowCreateModal] =
    useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [actionMessage, setActionMessage] = useState("");

  const [deliveryAgents, setDeliveryAgents] = useState([]);
  const [assigningOrderId, setAssigningOrderId] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);


  const [trackingOrderId, setTrackingOrderId] = useState(null);

  const gpsWatchIdRef = useRef(null);
  const activeTrackingOrderIdRef = useRef(null);
  const lastLocationSentAtRef = useRef(0);


  // ==================================================
  // SECTION 4: SEARCH AND STATUS FILTERING
  // ==================================================

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch = [
        order.id,
        order.customerName,
        order.destination,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

      const matchesStatus =
        selectedStatus === "All Statuses" ||
        order.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, selectedStatus]);

  // ==================================================
  // SECTION 5: CREATE ORDER
  // Admin only
  // ==================================================

  
const handleCreate = async (orderData) => {
  try {
    const token = localStorage.getItem("trackflow_token");

    if (!token) {
      return {
        success: false,
        message: "Please log in again to create an order.",
      };
    }

    const response = await fetch(`${API_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      
      
      body: JSON.stringify({
        customer_id: orderData.customer_id,

        pickup_address: orderData.pickup_address,
        pickup_latitude: orderData.pickup_latitude ?? null,
        pickup_longitude: orderData.pickup_longitude ?? null,

        dropoff_address: orderData.dropoff_address,
        dropoff_latitude: orderData.dropoff_latitude ?? null,
        dropoff_longitude: orderData.dropoff_longitude ?? null,

        sender_phone: orderData.phone,
        recipient_name: orderData.recipient_name,
        recipient_phone: orderData.recipient_phone,
        package_description: orderData.package_description,
        special_instructions: orderData.special_instructions,
      }),

    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Could not create the order.",
      };
    }

    await refreshOrders();
    setActionMessage("Order created successfully!");

    return { success: true };
  } catch {
    return {
      success: false,
      message: "Unable to reach the server. Please try again.",
    };
  }
};


  // ==================================================
  // SECTION 6: EDIT AND DELETE ORDER
  // Existing backend limitations are preserved
  // ==================================================

 
const handleSave = async (formData) => {
  try {
    const token = localStorage.getItem("trackflow_token");

    if (!token) {
      throw new Error("Please log in again.");
    }

    const response = await fetch(
      `${API_URL}/api/orders/${formData.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickup_address: formData.pickup_address,
          dropoff_address: formData.dropoff_address,
          sender_phone: formData.sender_phone,
          recipient_name: formData.recipient_name,
          recipient_phone: formData.recipient_phone,
          package_description: formData.package_description,
          special_instructions: formData.special_instructions,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not update order.");
    }

    await refreshOrders();
    setEditingOrder(null);
    setActionMessage(`Order ${formData.id} updated successfully.`);
    return { success: true };
  } catch (error) {
    setActionMessage(error.message || "Order update failed.");
    return {
      success: false,
      message: error.message || "Order update failed.",
    };
  }
};



const handleDelete = async (order) => {
  const confirmed = window.confirm(
    `Permanently delete Order ${order.id}? Its tracking history and location records will also be deleted.`
  );

  if (!confirmed) return;

  try {
    setActionMessage("");

    const token = localStorage.getItem("trackflow_token");

    if (!token) {
      throw new Error("Please log in again.");
    }

    const response = await fetch(
      `${API_URL}/api/orders/${order.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || `Delete failed with HTTP ${response.status}.`
      );
    }

    if (String(selectedOrder?.id) === String(order.id)) {
      setSelectedOrder(null);
    }

    if (String(editingOrder?.id) === String(order.id)) {
      setEditingOrder(null);
    }

    await refreshOrders();

    setActionMessage(`Order ${order.id} deleted successfully.`);
  } catch (error) {
    setActionMessage(error.message || "Failed to delete order.");
  }
};



  // ==================================================
  // SECTION 7: LOAD DELIVERY AGENTS
  // Admin only
  // ==================================================

  
const handleOpenAssignment = async (order) => {
  try {
    const token = localStorage.getItem("trackflow_token");

    const response = await fetch(`${API_URL}/api/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load delivery agents.");
    }

    const users = Array.isArray(data)
  ? data
  : Array.isArray(data.users)
    ? data.users
    : Array.isArray(data.data)
      ? data.data
      : [];

    const agents = users.filter((user) => {
      const role = String(user.role || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

      return role === "delivery_agent";
    });

    setDeliveryAgents(agents);
    setSelectedAgentId(
      order.assigned_agent_id != null
        ? String(order.assigned_agent_id)
        : ""
    );
    setAssigningOrderId(order.id);
    setActionMessage(
      agents.length
        ? ""
        : "No delivery agents were returned by the Users API."
    );
  } catch (error) {
    setActionMessage(error.message || "Could not load delivery agents.");
    setDeliveryAgents([]);
  }
};


  // ==================================================
  // SECTION 8: ASSIGN ORDER TO DELIVERY AGENT
  // Admin only
  // ==================================================

  const handleAssignAgent = async (order) => {
    if (!selectedAgentId) {
      setActionMessage("Please select a delivery agent.");
      return;
    }

    setIsAssigning(true);
    setActionMessage("");

    try {
      const token = localStorage.getItem("trackflow_token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch(
        `${API_URL}/api/orders/${order.id}/assign`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            agent_id: Number(selectedAgentId),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not assign delivery agent."
        );
      }

      await refreshOrders();
      setAssigningOrderId(null);
      setSelectedAgentId("");
      setActionMessage(
        `Delivery agent assigned to Order ${order.id}.`
      );
    } catch (error) {
      setActionMessage(
        error.message || "Assignment failed."
      );
    } finally {
      setIsAssigning(false);
    }
  };

  
  // ==================================================
  // SECTION: UPDATE ORDER STATUS
  // Delivery agent updates an assigned order
  // ==================================================

  const handleUpdateStatus = async (order, newStatus) => {
    try {
      const token = localStorage.getItem("trackflow_token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const statusMap = {
        "Picked Up": "picked_up",
        "In Transit": "in_transit",
        Delivered: "delivered",
      };

      const response = await fetch(
        `${API_URL}/api/orders/${order.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: statusMap[newStatus],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update status.");
      }

      await refreshOrders();
      setActionMessage(`Order ${order.id} status updated to ${newStatus}.`);
    } catch (error) {
      setActionMessage(error.message || "Status update failed.");
    }
  };


  const stopLiveTracking = () => {
  if (gpsWatchIdRef.current !== null) {
    navigator.geolocation.clearWatch(gpsWatchIdRef.current);
  }

  gpsWatchIdRef.current = null;
  activeTrackingOrderIdRef.current = null;
  lastLocationSentAtRef.current = 0;

  setTrackingOrderId(null);
  setActionMessage("Live GPS tracking stopped.");
};

const handleShareLocation = (order) => {
  const token = localStorage.getItem("trackflow_token");

  if (!token) {
    setActionMessage("Please log in again.");
    return;
  }

  if (!navigator.geolocation) {
    setActionMessage("Your browser does not support GPS location.");
    return;
  }

  // Stop any previous tracking session.
  if (gpsWatchIdRef.current !== null) {
    navigator.geolocation.clearWatch(gpsWatchIdRef.current);
  }

  activeTrackingOrderIdRef.current = String(order.id);
  lastLocationSentAtRef.current = 0;
  setTrackingOrderId(order.id);

  setActionMessage(`Starting live GPS tracking for Order ${order.id}...`);

  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      if (
        activeTrackingOrderIdRef.current !== String(order.id)
      ) {
        return;
      }

      // Limit updates to approximately one every five seconds.
      const now = Date.now();

      if (now - lastLocationSentAtRef.current < 5000) {
        return;
      }

      lastLocationSentAtRef.current = now;

      try {
        const response = await fetch(
          `${API_URL}/api/orders/${order.id}/location`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "GPS update failed.");
        }

        if (
          activeTrackingOrderIdRef.current === String(order.id)
        ) {
          setActionMessage(
            `Live tracking active for Order ${order.id}. Last update: ${new Date().toLocaleTimeString()}`
          );
        }
      } catch (error) {
        if (
          activeTrackingOrderIdRef.current === String(order.id)
        ) {
          setActionMessage(error.message || "GPS update failed.");
        }
      }
    },
    (error) => {
      if (
        activeTrackingOrderIdRef.current !== String(order.id)
      ) {
        return;
      }

      const message =
        error.code === 1
          ? "Location permission denied. Allow browser location access."
          : error.code === 2
            ? "Your device location is unavailable."
            : "GPS request timed out.";

      stopLiveTracking();
      setActionMessage(message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    }
  );

  gpsWatchIdRef.current = watchId;
};


// Stop GPS tracking when the order is delivered or cancelled.
useEffect(() => {
  if (!trackingOrderId) return;

  const activeOrder = orders.find(
    (order) => String(order.id) === String(trackingOrderId)
  );

  if (
    activeOrder &&
    ["Delivered", "Cancelled"].includes(activeOrder.status)
  ) {
    stopLiveTracking();
  }
}, [orders, trackingOrderId]);

// Clean up GPS tracking when leaving the Orders page.
useEffect(() => {
  return () => {
    if (
      gpsWatchIdRef.current !== null &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
    }
  };
}, []);

  // ==================================================
  // SECTION 9: PAGE HEADER
  // ==================================================

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Orders
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? "View and manage shipment orders."
              : "View your assigned shipment orders."}
          </p>
        </div>

        {/* Admins can create orders; delivery agents cannot. */}
        {(isAdmin || isCustomer) && (
          <button
            type="button"
            onClick={() => {
              setActionMessage("");
              setShowCreateModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Create Order
          </button>
        )}
      </div>

      {/* ==================================================
          SECTION 10: SUCCESS AND ERROR MESSAGES
         ================================================== */}

      {actionMessage && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {ordersError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{ordersError}</span>

          <button
            type="button"
            onClick={refreshOrders}
            className="inline-flex items-center gap-2 self-start font-semibold hover:underline"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      )}

      {/* ==================================================
          SECTION 11: SEARCH, FILTER AND REFRESH
         ================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search by order, customer, or destination..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(event) =>
              setSelectedStatus(event.target.value)
            }
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={refreshOrders}
            disabled={isLoadingOrders}
            title="Refresh orders"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={isLoadingOrders ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* ==================================================
            SECTION 12: LOADING AND EMPTY STATES
           ================================================== */}

        {isLoadingOrders && orders.length === 0 ? (
          <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
            <RefreshCw size={20} className="animate-spin" />
            <span>Loading orders...</span>
          </div>
        ) : !isLoadingOrders && filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package size={38} className="mb-3 text-slate-300" />

            <h2 className="font-semibold text-slate-800">
              No orders found
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {orders.length === 0
                ? "No orders are available for this account yet."
                : "Try changing your search or status filter."}
            </p>
          </div>
        ) : (
          /* ==================================================
             SECTION 13: ORDERS TABLE
             ================================================== */

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">
                    Order ID
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Customer
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Destination
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Date
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {order.id}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {order.customerName || "Customer"}
                    </td>

                    <td className="max-w-xs truncate px-4 py-4 text-sm text-slate-600">
                      {order.destination || "Not specified"}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-600">
                      {order.date || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[order.status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    {/* ==================================================
                        SECTION 14: ROLE-BASED ACTION BUTTONS
                       ================================================== */}

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap justify-end gap-1">

                        {/* Admin-only: Assign delivery agent */}
                        
                        {isAdmin && (
                          <div className="flex flex-col items-end gap-1">
                            {order.assignedAgentName && (
                              <span className="text-xs text-slate-600">
                                Agent: {order.assignedAgentName}
                              </span>
                            )}

                            {["delivered", "cancelled"].includes(
                              String(order.status || "").trim().toLowerCase()
                            ) ? (
                              <span className="text-xs font-medium text-slate-400">
                                {String(order.status).toLowerCase() === "delivered"
                                  ? "Completed"
                                  : "Cancelled"}
                              </span>
                            ) : (
                              <button
                                type="button"
                                title={
                                  order.assignedAgentName
                                    ? "Change delivery agent"
                                    : "Assign delivery agent"
                                }
                                onClick={() => handleOpenAssignment(order)}
                                className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                              >
                                {order.assignedAgentName ? "Reassign" : "Assign"}
                              </button>
                            )}
                          </div>
                        )}


                        {/* Both admins and delivery agents can view */}
                        <button
                          type="button"
                          title="View order"
                          onClick={() =>
                            setSelectedOrder(order)
                          }
                          className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Eye size={17} />
                        </button>

                        {/* Customer-only: Edit pending order */}
                        {isCustomer && order.status === "Pending" && (
                          <button
                            type="button"
                            title="Edit pending order"
                            onClick={() => {
                              setActionMessage("");
                              setEditingOrder(order);
                            }}
                            className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                          >
                            <Pencil size={17} />
                          </button>
                        )}

                        
                        {/* Customer-only: Cancel pending order */}
                        {!isAdmin &&
                          !isDeliveryAgent &&
                          order.status === "Pending" && (
                            <button
                              type="button"
                              title="Cancel pending order"
                              onClick={async () => {
                                const confirmed = window.confirm(
                                  `Cancel order ${order.id}?`
                                );

                                if (!confirmed) return;

                                try {
                                  const token = localStorage.getItem("trackflow_token");

                                  if (!token) {
                                    throw new Error("Please log in again.");
                                  }

                                  const response = await fetch(
                                    `${API_URL}/api/orders/${order.id}/cancel`,
                                    {
                                      method: "POST",
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    }
                                  );

                                  const data = await response.json();

                                  if (!response.ok) {
                                    throw new Error(
                                      data.message || "Could not cancel the order."
                                    );
                                  }

                                  await refreshOrders();
                                  setActionMessage(
                                    `Order ${order.id} cancelled successfully.`
                                  );
                                } catch (error) {
                                  setActionMessage(
                                    error.message || "Order cancellation failed."
                                  );
                                }
                              }}
                              className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              Cancel Order
                            </button>
                          )}


                        
                        {/* Delivery agent: update assigned order status */}
                        
                        {isDeliveryAgent && order.status !== "Delivered" && order.status !== "Cancelled" && (
                          <select
                            value=""
                            onChange={(event) => {
                              if (event.target.value) {
                                handleUpdateStatus(order, event.target.value);
                              }
                            }}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            aria-label={`Update status for order ${order.id}`}
                          >
                            <option value="">Update Status</option>
                            {order.status === "Pending" && (
                              <option value="Picked Up">Picked Up</option>
                            )}
                            {order.status === "Picked Up" && (
                              <option value="In Transit">In Transit</option>
                            )}
                            {order.status === "In Transit" && (
                              <option value="Delivered">Delivered</option>
                            )}
                          </select>
                        )}

                        
                        {isDeliveryAgent &&
                        (order.status === "Picked Up" ||
                          order.status === "In Transit") && (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (String(trackingOrderId) === String(order.id)) {
                                  stopLiveTracking();
                                } else {
                                  handleShareLocation(order);
                                }
                              }}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                                String(trackingOrderId) === String(order.id)
                                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                  : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                              }`}
                            >
                              {String(trackingOrderId) === String(order.id)
                                ? "Stop Live Tracking"
                                : "Start Live Tracking"}
                            </button>

                            {String(trackingOrderId) === String(order.id) && (
                              <span className="text-xs font-medium text-emerald-600">
                                GPS tracking active
                              </span>
                            )}
                          </div>
                        )}



                        {/* Admin-only: Edit order */}
                        {isAdmin && (
                          <button
                            type="button"
                            title="Edit order"
                            onClick={() => {
                              setActionMessage("");
                              setEditingOrder(order);
                            }}
                            className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                          >
                            <Pencil size={17} />
                          </button>
                        )}

                        {/* Admin-only: Delete order */}
                        {isAdmin && (
                          <button
                            type="button"
                            title="Delete order"
                            onClick={() =>
                              handleDelete(order)
                            }
                            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={17} />
                          </button>
                        )}
                      </div>

                      {/* ==================================================
                          SECTION 15: DELIVERY AGENT ASSIGNMENT PANEL
                          Admin-only
                         ================================================== */}

                      {isAdmin &&
                        assigningOrderId === order.id && (
                          <div className="mt-3 flex min-w-52 flex-col gap-2">
                            <select
                              value={selectedAgentId}
                              onChange={(event) =>
                                setSelectedAgentId(
                                  event.target.value
                                )
                              }
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            >
                              <option value="">
                                Select delivery agent
                              </option>

                              {deliveryAgents.map((agent) => (
                                <option
                                  key={agent.id}
                                  value={agent.id}
                                >
                                  {agent.full_name} (ID: {agent.id})
                                </option>
                              ))}
                            </select>

                            {deliveryAgents.length === 0 && (
                              <p className="text-xs text-slate-500">
                                No delivery agents found.
                              </p>
                            )}

                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={
                                  isAssigning || !selectedAgentId
                                }
                                onClick={() =>
                                  handleAssignAgent(order)
                                }
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                {isAssigning
                                  ? "Assigning..."
                                  : "Save Assignment"}
                              </button>

                              <button
                                type="button"
                                disabled={isAssigning}
                                onClick={() => {
                                  setAssigningOrderId(null);
                                  setSelectedAgentId("");
                                }}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ==================================================
            SECTION 16: ORDER COUNT
           ================================================== */}

        <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {/* ==================================================
          SECTION 17: CREATE ORDER MODAL
          Admin-only
         ================================================== */}

      {(isAdmin || isCustomer) && showCreateModal && (
        <CreateOrderForm
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}

      {/* ==================================================
          SECTION 18: VIEW ORDER MODAL
         ================================================== */}

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* SECTION 19: EDIT ORDER MODAL
          Admin and customer; backend enforces permissions */}

      {(isAdmin || isCustomer) && editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={handleSave}
        />
      )}

    </div>
  );
}

export default Orders;
