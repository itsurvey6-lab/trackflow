
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  Power,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadCustomers() {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("trackflow_token");

      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load customers.");
      }

      const users = Array.isArray(data) ? data : data.users || [];

      setCustomers(
        users.filter((user) => user.role === "customer")
      );
    } catch (err) {
      setError(err.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const activeCount = customers.filter(
    (customer) => customer.is_active
  ).length;

  const inactiveCount = customers.length - activeCount;

  const filteredCustomers = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        !searchText ||
        customer.full_name?.toLowerCase().includes(searchText) ||
        customer.email?.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && customer.is_active) ||
        (statusFilter === "inactive" && !customer.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  async function toggleCustomerStatus(customer) {
    const newStatus = !customer.is_active;

    const confirmed = window.confirm(
      `Are you sure you want to ${
        newStatus ? "activate" : "deactivate"
      } ${customer.full_name}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setUpdatingId(customer.id);

    try {
      const token = localStorage.getItem("trackflow_token");

      const response = await fetch(
        `${API_URL}/api/users/${customer.id}/customer-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            is_active: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update customer.");
      }

      setCustomers((current) =>
        current.map((item) =>
          String(item.id) === String(customer.id)
            ? { ...item, ...data.customer }
            : item
        )
      );

      setSuccess(data.message);
    } catch (err) {
      setError(err.message || "Failed to update customer.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Customer Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          View and manage registered TrackFlow customers.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Customers"
          value={customers.length}
          icon={<Users size={23} />}
        />

        <StatCard
          title="Active Customers"
          value={activeCount}
          icon={<UserCheck size={23} />}
        />

        <StatCard
          title="Inactive Customers"
          value={inactiveCount}
          icon={<UserX size={23} />}
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Registered Customers
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {filteredCustomers.length} of {customers.length} customers
            </p>
          </div>

          <button
            type="button"
            onClick={loadCustomers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer name or email..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="all">All Customers</option>
            <option value="active">Active Customers</option>
            <option value="inactive">Inactive Customers</option>
          </select>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-slate-500">
            Loading customers...
          </p>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No customers found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">City</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {customer.full_name}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {customer.email}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {customer.city || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          customer.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {customer.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => toggleCustomerStatus(customer)}
                        disabled={updatingId === customer.id}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white disabled:opacity-50 ${
                          customer.is_active
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        <Power size={14} />
                        {updatingId === customer.id
                          ? "Updating..."
                          : customer.is_active
                            ? "Deactivate"
                            : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
          {icon}
        </div>
      </div>
    </div>
  );
}
