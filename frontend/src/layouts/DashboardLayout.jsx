import {
  MapPin,
  LayoutDashboard,
  Package,
  MapPinned,
  UserRound,
  Users,
  LogOut,
  ChevronDown,
  ChartNoAxesCombined,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useNavigate, NavLink, Outlet } from "react-router-dom";

import NotificationBell from "../components/NotificationBell";



const navigation = [
  { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", path: "/orders", icon: Package },
  { name: "Tracking", path: "/tracking", icon: MapPinned },
  { name: "My Profile", path: "/profile", icon: UserRound },
  {
    name: "Delivery Agents",
    path: "/user-management",
    icon: Users,
    adminOnly: true,
  },
  {
    name: "Customers",
    path: "/admin/customers",
    icon: Users,
    adminOnly: true,
  },
  {
    name: "Reports & Analytics",
    path: "/reports",
    icon: ChartNoAxesCombined,
    adminOnly: true,
  },
];

function DashboardLayout() {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("trackflow_user") || "null")
  );

  useEffect(() => {
    const updateUser = () => {
      setUser(
        JSON.parse(localStorage.getItem("trackflow_user") || "null")
      );
    };

    window.addEventListener("trackflow-user-updated", updateUser);

    return () => {
      window.removeEventListener("trackflow-user-updated", updateUser);
    };
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("trackflow_token");
    localStorage.removeItem("trackflow_user");
    navigate("/login", { replace: true });
  }

  const displayName =
    user?.full_name || user?.name || user?.email || "User";

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Sidebar */}
      <aside className="w-full border-b border-slate-200 bg-white md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <MapPin size={22} />
          </div>

          <span className="text-xl font-bold tracking-tight text-slate-900">
            TrackFlow
          </span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 p-3" aria-label="Dashboard navigation">
          <p className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          {navigation
            .filter((item) => !item.adminOnly || user?.role === "admin")
            .map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.path === "/dashboard"}
                  onClick={() => setProfileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  <Icon size={19} />
                  {item.name}
                </NavLink>
              );
            })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-medium text-slate-900">
              Delivery Workspace
            </p>
            <p className="text-xs text-slate-500">
              Manage your delivery operations
            </p>
          </div>

          {/* Notifications + Profile */}
          <div className="flex items-center gap-2">
            <NotificationBell />

            {/* Profile Menu */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl p-2 hover:bg-slate-100"
                aria-expanded={profileOpen}
                aria-label="Open profile menu"
              >
                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {user?.avatar_url ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL}${user.avatar_url}`}
                      alt="Profile"
                      className="size-full object-cover"
                    />
                  ) : (
                    displayName
                      .split(" ")
                      .filter(Boolean)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>

                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-slate-900">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(user?.role || "user").replaceAll("_", " ")}
                  </p>
                </div>

                <ChevronDown size={16} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <div className="border-b border-slate-100 px-3 py-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {displayName}
                    </p>

                    <p className="mt-1 break-all text-xs text-slate-500">
                      {user?.email || "Email unavailable"}
                    </p>

                    <p className="mt-2 text-xs capitalize text-blue-600">
                      {(user?.role || "user").replaceAll("_", " ")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
