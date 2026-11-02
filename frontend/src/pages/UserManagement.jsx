
import { useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  Users,
  RefreshCw,
  Power,
  Search,
  UserCheck,
  UserX,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function UserManagement() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  async function loadAgents() {
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
        throw new Error(data.message || "Failed to load delivery agents.");
      }

      const users = Array.isArray(data) ? data : data.users || [];

      setAgents(
        users.filter((user) => user.role === "delivery_agent")
      );
    } catch (err) {
      setError(err.message || "Failed to load delivery agents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgents();
  }, []);

  const activeCount = agents.filter((agent) => agent.is_active).length;
  const inactiveCount = agents.filter((agent) => !agent.is_active).length;

  const filteredAgents = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return agents.filter((agent) => {
      const matchesSearch =
        !searchText ||
        agent.full_name?.toLowerCase().includes(searchText) ||
        agent.email?.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && agent.is_active) ||
        (statusFilter === "inactive" && !agent.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [agents, search, statusFilter]);

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const token = localStorage.getItem("trackflow_token");

      const response = await fetch(
        `${API_URL}/api/users/delivery-agents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create delivery agent.");
      }

      setForm({
        full_name: "",
        email: "",
        password: "",
      });

      setSuccess("Delivery agent created successfully.");

      await loadAgents();
    } catch (err) {
      setError(err.message || "Failed to create delivery agent.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAgentStatus(agent) {
    const newStatus = !agent.is_active;

    const confirmed = window.confirm(
      `Are you sure you want to ${
        newStatus ? "activate" : "deactivate"
      } ${agent.full_name}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setUpdatingId(agent.id);

    try {
      const token = localStorage.getItem("trackflow_token");

      const response = await fetch(
        `${API_URL}/api/users/${agent.id}/status`,
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
        throw new Error(data.message || "Failed to update agent status.");
      }

      setAgents((currentAgents) =>
        currentAgents.map((item) =>
          String(item.id) === String(agent.id)
            ? { ...item, ...data.agent }
            : item
        )
      );

      setSuccess(data.message || "Agent status updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update agent status.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Delivery Agents
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create, search and manage your delivery team.
        </p>
      </div>

      {/* Feedback messages */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Agents</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {agents.length}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active Agents</p>
              <p className="mt-2 text-3xl font-bold text-green-700">
                {activeCount}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-green-600">
              <UserCheck size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Inactive Agents</p>
              <p className="mt-2 text-3xl font-bold text-red-700">
                {inactiveCount}
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-red-600">
              <UserX size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Create agent form */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
            <UserPlus size={22} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Create Delivery Agent
            </h2>
            <p className="text-sm text-slate-500">
              Create a new account for a delivery team member.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 md:grid-cols-2"
        >
          <input
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            placeholder="Full name"
            autoComplete="name"
            required
            className="rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />

          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email address"
            autoComplete="email"
            required
            className="rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />

          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Initial password (minimum 8 characters)"
            autoComplete="new-password"
            minLength={8}
            required
            className="rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 md:col-span-2"
          />

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 md:justify-self-start"
          >
            <UserPlus size={18} />
            {saving ? "Creating..." : "Create Delivery Agent"}
          </button>
        </form>
      </section>

      {/* Agent list */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Users size={21} className="text-slate-500" />
            <div>
              <h2 className="font-semibold text-slate-900">
                Registered Delivery Agents
              </h2>
              <p className="text-xs text-slate-500">
                {filteredAgents.length} of {agents.length} agents
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAgents}
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

        {/* Search and filter */}
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
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="all">All Agents</option>
            <option value="active">Active Agents</option>
            <option value="inactive">Inactive Agents</option>
          </select>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-slate-500">
            Loading delivery agents...
          </p>
        ) : filteredAgents.length === 0 ? (
          <div className="p-10 text-center">
            <Users
              size={32}
              className="mx-auto mb-3 text-slate-300"
            />
            <p className="font-medium text-slate-700">
              No delivery agents found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredAgents.map((agent) => (
                  <tr key={agent.id}>
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {agent.full_name}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {agent.email}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      Delivery Agent
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          agent.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {agent.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => toggleAgentStatus(agent)}
                        disabled={updatingId === agent.id}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                          agent.is_active
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        <Power size={14} />
                        {updatingId === agent.id
                          ? "Updating..."
                          : agent.is_active
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

export default UserManagement;
