import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  Ban,
  Eye,
  Pencil,
  RefreshCw,
  X,
  MapPin,
  Package,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API = `${API_URL}/api/admin/customers`;

const emptyForm = {
  full_name: "",
  phone: "",
  city: "",
  address: "",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    blocked: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || styles.inactive
      }`}
    >
      {status || "unknown"}
    </span>
  );
}

export default function Customers() {
  const token = localStorage.getItem("trackflow_token");

  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [blockReason, setBlockReason] = useState("");
  const [message, setMessage] = useState("");

  const request = useCallback(
    async (url, options = {}) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    },
    [token]
  );

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        search,
        status,
        page: String(page),
        limit: "10",
      });

      const data = await request(`${API}?${params}`);

      setCustomers(data.customers || []);
      setStats(data.stats || {});
      setPagination(data.pagination || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [request, search, status, page]);

  useEffect(() => {
    const timer = setTimeout(loadCustomers, 300);
    return () => clearTimeout(timer);
  }, [loadCustomers]);

  async function openProfile(customerId) {
    setProfileLoading(true);
    setSelectedCustomer(null);
    setEditing(false);
    setMessage("");

    try {
      const data = await request(`${API}/${customerId}`);
      setSelectedCustomer(data);
      setForm({
        full_name: data.customer.full_name || "",
        phone: data.customer.phone || "",
        city: data.customer.city || "",
        address: data.customer.address || "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setProfileLoading(false);
    }
  }

  async function updateCustomer() {
    try {
      const data = await request(`${API}/${selectedCustomer.customer.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });

      setMessage(data.message);
      setEditing(false);
      await openProfile(selectedCustomer.customer.id);
      await loadCustomers();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function updateStatus(accountStatus) {
    const customerId = selectedCustomer.customer.id;

    let reason = null;

    if (accountStatus === "blocked") {
      reason = window.prompt("Enter the reason for blocking this customer:");

      if (reason === null) return;
      if (!reason.trim()) {
        setMessage("A block reason is required.");
        return;
      }
    }

    const confirmed = window.confirm(
      `Are you sure you want to set this account to "${accountStatus}"?`
    );

    if (!confirmed) return;

    try {
      const data = await request(`${API}/${customerId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          account_status: accountStatus,
          block_reason: reason,
        }),
      });

      setMessage(data.message);
      await openProfile(customerId);
      await loadCustomers();
    } catch (err) {
      setMessage(err.message);
    }
  }

  const customer = selectedCustomer?.customer;
  const orders = selectedCustomer?.orders || [];
  const summary = selectedCustomer?.summary || {};

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Customer Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage customer accounts, profiles, orders and delivery activity.
          </p>
        </div>

        <button
          onClick={loadCustomers}
          className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Total Customers",
            value: stats.total ?? 0,
            icon: Users,
            color: "text-blue-600 bg-blue-50",
          },
          {
            title: "Active Customers",
            value: stats.active ?? 0,
            icon: UserCheck,
            color: "text-green-600 bg-green-50",
          },
          {
            title: "Inactive Customers",
            value: stats.inactive ?? 0,
            icon: UserX,
            color: "text-slate-600 bg-slate-100",
          },
          {
            title: "Blocked Customers",
            value: stats.blocked ?? 0,
            icon: Ban,
            color: "text-red-600 bg-red-50",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{item.title}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {item.value}
                  </p>
                </div>
                <div className={`rounded-xl p-3 ${item.color}`}>
                  <Icon size={23} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and filter */}
      <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm md:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, phone or customer ID..."
            className="w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="all">All Customers</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Customer table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Contact</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Orders</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Registered</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-slate-500">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-slate-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                          {item.full_name?.charAt(0)?.toUpperCase() || "C"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {item.full_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            ID #{item.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p>{item.email}</p>
                      <p className="text-xs text-slate-500">
                        {item.phone || "No phone"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {item.city || "Not provided"}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {item.total_orders}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={item.account_status} />
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {formatDate(item.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {/* View customer */}
                        <button
                          onClick={() => openProfile(item.id)}
                          title="View customer details"
                          className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                        >
                          <Eye size={16} />
                        </button>

                        {/* Edit customer */}
                        <button
                          onClick={async () => {
                            await openProfile(item.id);
                            setEditing(true);
                          }}
                          title="Edit customer"
                          className="rounded-lg bg-amber-50 p-2 text-amber-700 hover:bg-amber-100"
                        >
                          <Pencil size={16} />
                        </button>

                        {/* Deactivate customer */}
                        {item.account_status === "active" && (
                          <button
                            onClick={async () => {
                              const confirmed = window.confirm(
                                `Are you sure you want to deactivate ${item.full_name}?`
                              );

                              if (!confirmed) return;

                              try {
                                await request(`${API}/${item.id}/status`, {
                                  method: "PATCH",
                                  body: JSON.stringify({
                                    account_status: "inactive",
                                    block_reason: null,
                                  }),
                                });

                                await loadCustomers();
                              } catch (err) {
                                setError(err.message);
                              }
                            }}
                            title="Deactivate customer"
                            className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100"
                          >
                            <UserX size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t p-4 text-sm">
          <p className="text-slate-500">
            Showing {customers.length} of {pagination.total || 0} customers
          </p>

          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border px-3 py-2 disabled:opacity-40"
            >
              Previous
            </button>

            <span className="px-3 py-2">
              {pagination.page || 1} / {pagination.pages || 1}
            </span>

            <button
              disabled={page >= (pagination.pages || 1)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border px-3 py-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Profile modal */}
      {(profileLoading || selectedCustomer) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 py-8 md:p-8">
          <div className="my-auto w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            {profileLoading ? (
              <div className="p-16 text-center text-slate-500">
                Loading customer profile...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b p-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Customer Profile
                    </h2>
                    <p className="text-sm text-slate-500">
                      Customer ID #{customer.id}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setEditing(false);
                      setMessage("");
                    }}
                    className="rounded-lg p-2 hover:bg-slate-100"
                  >
                    <X size={21} />
                  </button>
                </div>

                <div className="space-y-6 p-5">
                  {message && (
                    <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                      {message}
                    </div>
                  )}

                  {/* Customer details */}
                  <section className="rounded-xl border p-5">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                          {customer.full_name?.charAt(0)?.toUpperCase() || "C"}
                        </div>

                        <div>
                          <h3 className="text-lg font-bold">
                            {customer.full_name}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {customer.email}
                          </p>
                        </div>
                      </div>

                      <StatusBadge status={customer.account_status} />
                    </div>

                    {editing ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {[
                          ["full_name", "Full Name"],
                          ["phone", "Phone"],
                          ["city", "City"],
                          ["address", "Address"],
                        ].map(([field, label]) => (
                          <label key={field} className="text-sm font-medium">
                            {label}
                            <input
                              value={form[field]}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  [field]: e.target.value,
                                })
                              }
                              className="mt-1 w-full rounded-lg border p-2.5 font-normal outline-none focus:border-blue-500"
                            />
                          </label>
                        ))}

                        <div className="flex gap-2 md:col-span-2">
                          <button
                            onClick={updateCustomer}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditing(false)}
                            className="rounded-lg border px-4 py-2 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 text-sm md:grid-cols-2">
                          <Detail label="Email" value={customer.email} />
                          <Detail label="Phone" value={customer.phone} />
                          <Detail label="City" value={customer.city} />
                          <Detail label="Address" value={customer.address} />
                          <Detail
                            label="Registration"
                            value={formatDate(customer.created_at)}
                          />
                          <Detail
                            label="Last Updated"
                            value={formatDate(customer.updated_at)}
                          />
                        </div>

                        {customer.block_reason && (
                          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            Block reason: {customer.block_reason}
                          </p>
                        )}

                        <button
                          onClick={() => setEditing(true)}
                          className="mt-5 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          <Pencil size={15} />
                          Edit Customer
                        </button>
                      </>
                    )}
                  </section>

                  {/* Customer account actions */}
                  <section>
                    <h3 className="mb-3 font-bold text-slate-900">
                      Account Actions
                    </h3>

                    <div className="flex flex-wrap gap-2">
                      {customer.account_status !== "active" && (
                        <ActionButton
                          color="green"
                          onClick={() => updateStatus("active")}
                        >
                          <UserCheck size={15} />
                          Activate
                        </ActionButton>
                      )}

                      {customer.account_status !== "inactive" && (
                        <ActionButton
                          color="gray"
                          onClick={() => updateStatus("inactive")}
                        >
                          <UserX size={15} />
                          Deactivate
                        </ActionButton>
                      )}

                      {customer.account_status !== "blocked" && (
                        <ActionButton
                          color="red"
                          onClick={() => updateStatus("blocked")}
                        >
                          <Ban size={15} />
                          Block
                        </ActionButton>
                      )}
                    </div>
                  </section>

                  {/* Order statistics */}
                  <section>
                    <h3 className="mb-3 font-bold text-slate-900">
                      Order Overview
                    </h3>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                      {[
                        ["Total", summary.total_orders, Package],
                        ["Pending", summary.pending_orders, Clock],
                        ["Active", summary.active_orders, Truck],
                        ["Delivered", summary.delivered_orders, CheckCircle],
                        ["Cancelled", summary.cancelled_orders, AlertCircle],
                      ].map(([label, value, Icon]) => (
                        <div
                          key={label}
                          className="rounded-xl border bg-slate-50 p-4"
                        >
                          <Icon size={19} className="mb-2 text-blue-600" />
                          <p className="text-2xl font-bold">{value ?? 0}</p>
                          <p className="text-xs text-slate-500">{label}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Orders */}
                  <section>
                    <h3 className="mb-3 font-bold text-slate-900">
                      Customer Orders
                    </h3>

                    {orders.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                        This customer has not placed any orders yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orders.map((order) => (
                          <div
                            key={order.id}
                            className="rounded-xl border p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-bold">
                                  Order #{order.id}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatDate(order.created_at)}
                                </p>
                              </div>

                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                {order.status}
                              </span>
                            </div>

                            <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                              <Detail
                                label="Order ID"
                                value={order.id}
                              />
                              <Detail
                                label="Assigned Agent"
                                value={order.assigned_agent_id || "Not assigned"}
                              />
                            </div>

                            <div className="mt-4">
                              <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                                Status History
                              </p>

                              {order.status_history?.length ? (
                                <div className="space-y-2">
                                  {order.status_history.map((log, index) => (
                                    <div
                                      key={log.id ?? index}
                                      className="flex justify-between gap-3 border-l-2 border-blue-200 py-1 pl-3 text-xs"
                                    >
                                      <span>
                                        {log.status || log.new_status || "Update"}
                                      </span>
                                      <span className="text-slate-500">
                                        {formatDate(log.created_at)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  No status history available.
                                </p>
                              )}
                            </div>

                            <div className="mt-4">
                              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                                <MapPin size={14} />
                                Delivery Location History
                              </p>

                              {order.location_history?.length ? (
                                <div className="space-y-2">
                                  {order.location_history.map((location, index) => (
                                    <div
                                      key={location.id ?? index}
                                      className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 p-3 text-xs"
                                    >
                                      <span>
                                        {location.latitude}, {location.longitude}
                                      </span>
                                      <span className="text-slate-500">
                                        {formatDate(
                                          location.created_at ||
                                          location.recorded_at
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  No delivery locations recorded.
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words font-medium text-slate-800">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function ActionButton({ children, color, onClick }) {
  const colors = {
    green: "border-green-200 text-green-700 hover:bg-green-50",
    gray: "border-slate-200 text-slate-700 hover:bg-slate-50",
    red: "border-red-200 text-red-700 hover:bg-red-50",
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${colors[color]}`}
    >
      {children}
    </button>
  );
}
