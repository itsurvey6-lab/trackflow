
import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  RefreshCw,
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  Users,
  UserCheck,
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const STATUS_COLORS = {
  placed: "#f59e0b",
  picked_up: "#3b82f6",
  in_transit: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

const STATUS_LABELS = {
  placed: "Pending",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const cards = [
  { key: "total", label: "Total Orders", icon: Package, color: "blue" },
  { key: "pending", label: "Pending", icon: Clock, color: "amber" },
  { key: "picked_up", label: "Picked Up", icon: Truck, color: "indigo" },
  { key: "in_transit", label: "In Transit", icon: Truck, color: "purple" },
  { key: "delivered", label: "Delivered", icon: CheckCircle, color: "green" },
  { key: "cancelled", label: "Cancelled", icon: XCircle, color: "red" },
];

const presets = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7days" },
  { label: "Last 30 Days", value: "30days" },
  { label: "Custom Range", value: "custom" },
];

function getLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPresetDates(preset) {
  const end = new Date();
  const start = new Date();

  if (preset === "today") {
    // Start and end are today.
  } else if (preset === "7days") {
    start.setDate(start.getDate() - 6);
  } else {
    start.setDate(start.getDate() - 29);
  }

  return {
    startDate: getLocalDate(start),
    endDate: getLocalDate(end),
  };
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${String(dateString).slice(0, 10)}T00:00:00`);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function escapeCSV(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCSV(filename, rows) {
  const csv = rows.map((row) => row.map(escapeCSV).join(",")).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    indigo: "bg-indigo-50 text-indigo-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900">
            {value ?? 0}
          </h3>
        </div>

        <div className={`rounded-lg p-3 ${colors[color]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function Reports() {
  const initialDates = getPresetDates("30days");

  const [summary, setSummary] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [trendData, setTrendData] = useState([]);

  const [preset, setPreset] = useState("30days");
  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReports = useCallback(async () => {
    const token = localStorage.getItem("trackflow_token");

    if (!token) {
      setError("Please log in again to view reports.");
      setLoading(false);
      return;
    }

    if (!startDate || !endDate) {
      setError("Please select both a start date and an end date.");
      setLoading(false);
      return;
    }

    if (startDate > endDate) {
      setError("Start date cannot be after end date.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const endpoints = [
        `${API_URL}/api/reports/summary?${params}`,
        `${API_URL}/api/reports/orders-by-status?${params}`,
        `${API_URL}/api/reports/order-trends?${params}`,
      ];

      const responses = await Promise.all(
        endpoints.map(async (url) => {
          const response = await fetch(url, { headers });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Failed to load reports.");
          }

          return data;
        })
      );

      setSummary(responses[0]);

      setStatusData(
        (responses[1].data || []).map((item) => ({
          ...item,
          total: Number(item.total),
          name: STATUS_LABELS[item.status] || item.status,
        }))
      );

      setTrendData(
        (responses[2].data || []).map((item) => ({
          ...item,
          total: Number(item.total),
          date: String(item.date).slice(0, 10),
          displayDate: formatDate(item.date),
        }))
      );
    } catch (err) {
      console.error("Reports loading error:", err);
      setError(err.message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  function handlePresetChange(value) {
    setPreset(value);

    if (value !== "custom") {
      const dates = getPresetDates(value);
      setStartDate(dates.startDate);
      setEndDate(dates.endDate);
    }
  }

  function exportCSV() {
    if (!summary) return;

    const orders = summary.orders || {};
    const users = summary.users || {};

    const rows = [
      ["TrackFlow Reports & Analytics"],
      ["Report Period", `${startDate} to ${endDate}`],
      ["Generated At", new Date().toLocaleString()],
      [],
      ["Order Overview"],
      ["Metric", "Value"],
      ["Total Orders", orders.total ?? 0],
      ["Pending", orders.pending ?? 0],
      ["Picked Up", orders.picked_up ?? 0],
      ["In Transit", orders.in_transit ?? 0],
      ["Delivered", orders.delivered ?? 0],
      ["Cancelled", orders.cancelled ?? 0],
      [],
      ["User Overview"],
      ["Metric", "Value"],
      ["Active Customers", users.customers ?? 0],
      ["Active Delivery Agents", users.delivery_agents ?? 0],
      [],
      ["Orders by Status"],
      ["Status", "Total Orders"],
      ...statusData.map((item) => [item.name, item.total]),
      [],
      ["Daily Order Trends"],
      ["Date", "Total Orders"],
      ...trendData.map((item) => [item.date, item.total]),
    ];

    downloadCSV(
      `TrackFlow-Report-${startDate}-to-${endDate}.csv`,
      rows
    );
  }

  function exportPDF() {
    if (!summary) return;

    const doc = new jsPDF();
    const orders = summary.orders || {};
    const users = summary.users || {};

    doc.setFontSize(19);
    doc.text("TrackFlow Reports & Analytics", 14, 20);

    doc.setFontSize(10);
    doc.text(`Report Period: ${startDate} to ${endDate}`, 14, 29);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);

    autoTable(doc, {
      startY: 43,
      head: [["Order Overview", "Count"]],
      body: [
        ["Total Orders", orders.total ?? 0],
        ["Pending", orders.pending ?? 0],
        ["Picked Up", orders.picked_up ?? 0],
        ["In Transit", orders.in_transit ?? 0],
        ["Delivered", orders.delivered ?? 0],
        ["Cancelled", orders.cancelled ?? 0],
      ],
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    let nextY = doc.lastAutoTable.finalY + 10;

    autoTable(doc, {
      startY: nextY,
      head: [["User Overview", "Count"]],
      body: [
        ["Active Customers", users.customers ?? 0],
        ["Active Delivery Agents", users.delivery_agents ?? 0],
      ],
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    nextY = doc.lastAutoTable.finalY + 10;

    autoTable(doc, {
      startY: nextY,
      head: [["Order Status", "Total Orders"]],
      body: statusData.map((item) => [item.name, item.total]),
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Date", "Total Orders"]],
      body: trendData.map((item) => [
        formatDate(item.date),
        item.total,
      ]),
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`TrackFlow-Report-${startDate}-to-${endDate}.pdf`);
  }

  const orderStats = summary?.orders || {};
  const userStats = summary?.users || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of TrackFlow orders and delivery operations.
          </p>
        </div>

        <button
          onClick={fetchReports}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Clock size={19} className="text-blue-600" />
          <h2 className="font-semibold text-gray-800">Report Date Range</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {presets.map((item) => (
            <button
              key={item.value}
              onClick={() => handlePresetChange(item.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                preset === item.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Start Date
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              End Date
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Showing {formatDate(startDate)} – {formatDate(endDate)}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCSV}
              disabled={!summary || loading}
              className="flex items-center gap-2 rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              <FileSpreadsheet size={17} />
              Export Excel (CSV)
            </button>

            <button
              onClick={exportPDF}
              disabled={!summary || loading}
              className="flex items-center gap-2 rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <FileText size={17} />
              Export PDF
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && summary && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <RefreshCw size={16} className="animate-spin" />
          Updating reports...
        </div>
      )}

      {loading && !summary ? (
        <div className="flex min-h-64 items-center justify-center">
          <RefreshCw className="animate-spin text-blue-600" size={28} />
          <span className="ml-3 text-gray-600">Loading reports...</span>
        </div>
      ) : !summary ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-gray-600">Reports could not be loaded.</p>
          <button
            onClick={fetchReports}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              Order Overview
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <StatCard
                  key={card.key}
                  label={card.label}
                  value={orderStats[card.key]}
                  icon={card.icon}
                  color={card.color}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              User Overview
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard
                label="Active Customers"
                value={userStats.customers}
                icon={Users}
                color="blue"
              />
              <StatCard
                label="Active Delivery Agents"
                value={userStats.delivery_agents}
                icon={UserCheck}
                color="green"
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-600" />
                <h2 className="font-semibold text-gray-800">
                  Orders by Status
                </h2>
              </div>

              {statusData.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-500">
                  No order data available for this period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={100}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {statusData.map((item) => (
                        <Cell
                          key={item.status}
                          fill={STATUS_COLORS[item.status] || "#94a3b8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-600" />
                <h2 className="font-semibold text-gray-800">
                  Daily Order Trends
                </h2>
              </div>

              {trendData.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-500">
                  No order trend data available.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={trendData}
                    margin={{ top: 10, right: 15, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="displayDate" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Orders"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Reports;
