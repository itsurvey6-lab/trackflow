
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  MapPin,
  ClipboardList,
  Users,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useOrders } from "../context/OrderContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const statusStyles = {
  Pending: "bg-amber-50 text-amber-700",
  "Picked Up": "bg-violet-50 text-violet-700",
  "In Transit": "bg-blue-50 text-blue-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-red-50 text-red-700",
};

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("trackflow_user") || "null");
  } catch {
    return null;
  }
}

function StatCard({ title, value, icon: Icon, color, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [user] = useState(readUser);
  const role = user?.role || "customer";
  const isAdmin = role === "admin";
  const isAgent = role === "delivery_agent";

  const {
    orders,
    refreshOrders,
    isLoadingOrders,
    ordersError,
  } = useOrders();

  const [userStats, setUserStats] = useState({
    customers: 0,
    agents: 0,
  });
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  const fetchUserStats = useCallback(async () => {
    if (!isAdmin) return;

    const token = localStorage.getItem("trackflow_token");

    if (!token) {
      setUsersError("Please sign in again.");
      return;
    }

    setUsersLoading(true);
    setUsersError("");

    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load user statistics.");
      }

      if (!Array.isArray(data.users)) {
        throw new Error("Unexpected users response from server.");
      }

      const activeUsers = data.users.filter(
        (item) => item.is_active !== false
      );

      setUserStats({
        customers: activeUsers.filter(
          (item) => item.role === "customer"
        ).length,
        agents: activeUsers.filter(
          (item) => item.role === "delivery_agent"
        ).length,
      });
    } catch (error) {
      setUsersError(error.message || "Unable to load user statistics.");
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  const counts = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((o) => o.status === "Pending").length,
    pickedUp: orders.filter((o) => o.status === "Picked Up").length,
    inTransit: orders.filter((o) => o.status === "In Transit").length,
    delivered: orders.filter((o) => o.status === "Delivered").length,
    cancelled: orders.filter((o) => o.status === "Cancelled").length,
  }), [orders]);

  const pageTitle = isAdmin
    ? "Admin Dashboard"
    : isAgent
      ? "Delivery Dashboard"
      : "Customer Dashboard";

  const pageDescription = isAdmin
    ? "Monitor shipments and manage your delivery operations."
    : isAgent
      ? "Review your assigned deliveries and their progress."
      : "Track your orders and follow each delivery.";

  const stats = isAdmin
    ? [
        {
          title: "Total Orders",
          value: counts.total,
          icon: Package,
          color: "bg-blue-50 text-blue-600",
          description: "All shipments",
        },
        {
          title: "Pending",
          value: counts.pending,
          icon: Clock,
          color: "bg-amber-50 text-amber-600",
          description: "Awaiting processing",
        },
        {
          title: "Picked Up",
          value: counts.pickedUp,
          icon: ClipboardList,
          color: "bg-violet-50 text-violet-600",
          description: "Packages collected",
        },
        {
          title: "In Transit",
          value: counts.inTransit,
          icon: Truck,
          color: "bg-blue-50 text-blue-600",
          description: "Currently being delivered",
        },
        {
          title: "Delivered",
          value: counts.delivered,
          icon: CheckCircle2,
          color: "bg-emerald-50 text-emerald-600",
          description: "Successfully completed",
        },
        {
          title: "Cancelled",
          value: counts.cancelled,
          icon: XCircle,
          color: "bg-red-50 text-red-600",
          description: "Cancelled shipments",
        },
        {
          title: "Total Customers",
          value: usersLoading ? "..." : userStats.customers,
          icon: Users,
          color: "bg-indigo-50 text-indigo-600",
          description: "Active customer accounts",
        },
        {
          title: "Delivery Agents",
          value: usersLoading ? "..." : userStats.agents,
          icon: UserRoundCheck,
          color: "bg-cyan-50 text-cyan-600",
          description: "Active delivery agents",
        },
      ]
    : isAgent
      ? [
          {
            title: "Assigned Deliveries",
            value: counts.total,
            icon: ClipboardList,
            color: "bg-blue-50 text-blue-600",
            description: "Deliveries assigned to you",
          },
          {
            title: "Picked Up",
            value: counts.pickedUp,
            icon: Package,
            color: "bg-violet-50 text-violet-600",
            description: "Collected packages",
          },
          {
            title: "In Transit",
            value: counts.inTransit,
            icon: Truck,
            color: "bg-amber-50 text-amber-600",
            description: "Currently on the way",
          },
          {
            title: "Delivered",
            value: counts.delivered,
            icon: CheckCircle2,
            color: "bg-emerald-50 text-emerald-600",
            description: "Completed deliveries",
          },
        ]
      : [
          {
            title: "My Orders",
            value: counts.total,
            icon: Package,
            color: "bg-blue-50 text-blue-600",
            description: "Your shipments",
          },
          {
            title: "Pending",
            value: counts.pending,
            icon: Clock,
            color: "bg-amber-50 text-amber-600",
            description: "Awaiting processing",
          },
          {
            title: "In Transit",
            value: counts.inTransit,
            icon: Truck,
            color: "bg-violet-50 text-violet-600",
            description: "On the way to you",
          },
          {
            title: "Delivered",
            value: counts.delivered,
            icon: CheckCircle2,
            color: "bg-emerald-50 text-emerald-600",
            description: "Completed orders",
          },
        ];

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
    )
    .slice(0, 5);

  async function handleRefresh() {
    await Promise.all([
      refreshOrders(),
      isAdmin ? fetchUserStats() : Promise.resolve(),
    ]);
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {pageTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {pageDescription}
          </p>
          {user?.full_name && (
            <p className="mt-2 text-sm font-medium text-slate-700">
              Welcome, {user.full_name}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoadingOrders || usersLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              isLoadingOrders || usersLoading ? "animate-spin" : ""
            }
          />
          Refresh
        </button>
      </div>

      {ordersError && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center">
          <span>{ordersError}</span>
          <button
            type="button"
            onClick={refreshOrders}
            className="font-semibold hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {isAdmin && usersError && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:flex-row sm:items-center">
          <span>{usersError}</span>
          <button
            type="button"
            onClick={fetchUserStats}
            className="font-semibold hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {isAdmin && (
        <div className="rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-blue-300">
                OPERATIONS CONTROL
              </p>
              <h2 className="mt-2 text-xl font-bold">
                Manage your shipments
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                Review orders, prepare packages, and manage delivery assignments.
              </p>
            </div>
            <Link
              to="/orders"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400"
            >
              Manage Orders <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isAdmin
                ? "Recent Orders"
                : isAgent
                  ? "My Assigned Deliveries"
                  : "My Recent Orders"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest shipments and their current status.
            </p>
          </div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            View all <ArrowRight size={16} />
          </Link>
        </div>

        {isLoadingOrders && orders.length === 0 ? (
          <div className="flex items-center justify-center gap-3 p-12 text-slate-500">
            <RefreshCw size={20} className="animate-spin" />
            Loading orders...
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="flex flex-col items-center p-12 text-center">
            <Package size={36} className="text-slate-300" />
            <h3 className="mt-3 font-semibold text-slate-800">
              No orders yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Orders will appear here when they are available for your account.
            </p>
            {!isAgent && !isAdmin && (
              <Link
                to="/orders"
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                View Orders
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4 font-semibold">Order</th>
                  {isAdmin && (
                    <th className="px-5 py-4 font-semibold">Customer</th>
                  )}
                  <th className="px-5 py-4 font-semibold">Destination</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                      #{order.id}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {order.customerName || "Customer"}
                      </td>
                    )}
                    <td className="max-w-xs truncate px-5 py-4 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <MapPin size={15} className="shrink-0 text-slate-400" />
                        {order.destination || "Not specified"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {order.date || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[order.status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to="/orders"
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
