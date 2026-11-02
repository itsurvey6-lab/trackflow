
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  Search,
  Truck,
} from "lucide-react";

import { useOrders } from "../context/OrderContext";

import { io } from "socket.io-client";
import "leaflet/dist/leaflet.css";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";


// ==================================================
// SECTION 1: TRACKING PAGE COMPONENT
// Purpose: Manage shipment tracking state and behavior
// ==================================================


function Tracking() {


  // ==================================================
  // SECTION 2: GET ROUTE AND ORDER DATA
  // Purpose: Read the tracking ID, navigation, and orders
  // ==================================================

  const { trackingId } = useParams();
  const navigate = useNavigate();
  const { orders } = useOrders();

  // ==================================================
  // SECTION 3: LOCAL STATE AND API CONFIGURATION
  // Purpose: Store the search input and current GPS location
  // ==================================================

  const [searchId, setSearchId] = useState(trackingId || "");

  const [location, setLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  

  // ==================================================
  // SECTION 4: FIND THE SHIPMENT
  // Purpose: Match the URL tracking ID to an order
  // ==================================================

  // Find the selected order in the shared order list.
  
  const shipment = trackingId
    ? orders.find(
        (order) =>
          order.id.toLowerCase() === trackingId.trim().toLowerCase()
      )
    : null;


  // ==================================================
  // SECTION 5: FETCH THE LATEST SAVED GPS LOCATION
  // Purpose: Load the latest location once when the shipment changes
  // ==================================================

  
  useEffect(() => {
    let cancelled = false;
    let socket;

    async function fetchLocation() {
      setLocation(null);
      setLocationMessage("");

      if (!trackingId || !shipment) return;

      const token = localStorage.getItem("trackflow_token");

      if (!token) {
        setLocationMessage("Please sign in to view the delivery location.");
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/orders/${encodeURIComponent(trackingId)}/location`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setLocationMessage(
            data.message || "No delivery location is available yet."
          );
        } else {
          setLocation(data.location);
        }
      } catch {
        if (!cancelled) {
          setLocationMessage(
            "Could not connect to the location service."
          );
        }
      }

      if (cancelled) return;

      // Connect using the user's authentication token.
      socket = io(API_URL, {
        auth: { token },
      });

      // Join the authorized room for this order.
      socket.on("connect", () => {
        socket.emit("order:join", Number(trackingId), (reply) => {
          if (reply?.status !== "success") {
            console.error("Could not join tracking room:", reply?.message);
            setLocationMessage(
              reply?.message || "Could not join the tracking room."
            );
          }
        });
      });

      // Update the displayed coordinates whenever the agent sends a new location.
      socket.on("location:updated", (data) => {
        if (
          !cancelled &&
          String(data.orderId) === String(trackingId) &&
          data.location
        ) {
          setLocation(data.location);
          setLocationMessage("");
        }
      });

      socket.on("connect_error", (error) => {
        if (!cancelled) {
          console.error("Tracking connection failed:", error.message);
          setLocationMessage("Live tracking connection failed.");
        }
      });
    }

    fetchLocation();

    return () => {
      cancelled = true;

      if (socket) {
        socket.disconnect();
      }
    };
  }, [trackingId, shipment]);


  // ==================================================
  // SECTION 6: HANDLE TRACKING SEARCH
  // Purpose: Navigate to the requested tracking ID
  // ==================================================

  const handleSearch = (event) => {
    event.preventDefault();

    const id = searchId.trim();

    if (id) {
      navigate(`/tracking/${encodeURIComponent(id)}`);
    }
  };

  // ==================================================
  // SECTION 7: PREPARE SHIPMENT STATUS AND TIMELINE
  // Purpose: Convert the current status into timeline progress
  // ==================================================

  const isKnownShipment = Boolean(shipment);

  const statusOrder = {
    Pending: 0,
    "Picked Up": 1,
    "In Transit": 2,
    "Out for Delivery": 3,
    Delivered: 4,
    Cancelled: -1,
  };

  const currentStep = statusOrder[shipment?.status] ?? 0;

  const events = [
    {
      title: "Order Created",
      description: "The shipment has been registered in TrackFlow.",
      completed: true,
    },
    {
      title: "Picked Up",
      description:
        currentStep >= 1
          ? "The shipment has been picked up."
          : "Pickup confirmation has not been recorded yet.",
      completed: currentStep >= 1 && currentStep !== -1,
    },
    {
      title: "In Transit",
      description:
        shipment?.status === "In Transit" ||
        shipment?.status === "Out for Delivery" ||
        shipment?.status === "Delivered"
          ? "The package has progressed through the delivery network."
          : "The package has not yet been confirmed in transit.",
      completed: currentStep >= 2 && currentStep !== -1,
    },
    {
      title: "Out for Delivery",
      description:
        currentStep >= 3
          ? "The package is out for delivery or has been delivered."
          : "Awaiting a delivery status update.",
      completed: currentStep >= 3 && currentStep !== -1,
    },
    {
      title: "Delivered",
      description:
        shipment?.status === "Delivered"
          ? "Delivery has been completed."
          : "Awaiting delivery confirmation.",
      completed: shipment?.status === "Delivered",
    },
  ];

  // ==================================================
  // SECTION 8: EMPTY SEARCH PAGE
  // Purpose: Show the form when no tracking ID is in the URL
  // ==================================================

  // No tracking ID: display the tracking search form.
  
  if (!trackingId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Track your shipment
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Enter your tracking ID to find your order.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <form
            onSubmit={handleSearch}
            className="flex w-full flex-col gap-3 sm:flex-row"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
              <Search size={20} className="shrink-0 text-slate-400" />

              <input
                value={searchId}
                onChange={(event) => setSearchId(event.target.value)}
                placeholder="Enter tracking ID (e.g. TF-2048)"
                className="w-full min-w-0 py-3 text-sm outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Track Shipment
            </button>
          </form>
        </div>
      </div>
    );
  }


  // ==================================================
  // SECTION 9: SHIPMENT NOT FOUND PAGE
  // Purpose: Explain when the tracking ID does not match an order
  // ==================================================

  // Tracking ID doesn't match an order.
  if (!isKnownShipment) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Package className="mx-auto h-12 w-12 text-slate-400" />

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Shipment not found
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            We couldn't find an order with tracking ID{" "}
            <span className="font-semibold">{trackingId}</span>.
            Check the ID and try again.
          </p>

          <form onSubmit={handleSearch} className="mt-6 flex gap-2">
            <input
              value={searchId}
              onChange={(event) => setSearchId(event.target.value)}
              placeholder="Enter tracking ID"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              required
            />

            <button
              type="submit"
              aria-label="Search tracking ID"
              className="rounded-xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
            >
              <Search size={18} />
            </button>
          </form>

          <button
            onClick={() => navigate("/tracking")}
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft size={16} />
            Track another shipment
          </button>
        </div>
      </main>
    );
  }

  // ==================================================
  // SECTION 10: STYLE THE CURRENT SHIPMENT STATUS
  // Purpose: Choose a badge style based on shipment status
  // ==================================================

  const statusStyles =
    shipment.status === "Delivered"
      ? "bg-green-50 text-green-700"
      : shipment.status === "In Transit"
        ? "bg-blue-50 text-blue-700"
        : "bg-amber-50 text-amber-700";

  // ==================================================
  // SECTION 11: MAIN SHIPMENT TRACKING PAGE
  // Purpose: Display order details, route information, and progress
  // ==================================================

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          Back to home
        </button>

        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-600">
            TRACKFLOW / SHIPMENT TRACKING
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Track your shipment
          </h1>

          <p className="mt-2 text-slate-600">
            Check your order's current recorded status.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="mb-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"
        >
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
            <Search size={20} className="shrink-0 text-slate-400" />
            <input
              value={searchId}
              onChange={(event) => setSearchId(event.target.value)}
              placeholder="Enter tracking ID (e.g. TF-2048)"
              className="w-full min-w-0 py-3 text-sm text-slate-900 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
          >
            Track Shipment
          </button>
        </form>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Shipment heading */}
          <div className="flex flex-col gap-5 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Package size={25} />
              </div>

              <div>
                <p className="text-sm text-slate-500">Tracking number</p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {shipment.id}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Customer: {shipment.customerName}
                </p>
              </div>
            </div>

            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${statusStyles}`}
            >
              <Truck size={16} />
              {shipment.status}
            </span>
          </div>

        
          {/* Route and shipment information */}
          
          <section className="space-y-6 p-4 sm:p-6">
            {/* Route and order summary */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Route card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Delivery Route
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Origin to destination
                    </p>
                  </div>

                  <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Live tracking
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Origin */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                      <MapPin className="text-blue-600" size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Origin · Current location
                      </p>

                      <p className="mt-1 break-words font-semibold text-slate-900">
                        {location
                          ? `${location.latitude}, ${location.longitude}`
                          : locationMessage || "Location not recorded"}
                      </p>

                      {location && (
                        <p className="mt-1 text-xs text-slate-500">
                          Latest reported delivery coordinates
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Route connector */}
                  <div className="ml-5 h-7 border-l-2 border-dashed border-slate-300" />

                  {/* Destination */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                      <MapPin className="text-emerald-600" size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Destination
                      </p>

                      <p className="mt-1 break-words font-semibold text-slate-900">
                        {shipment.destination}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order information */}
              <div className="flex flex-col rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <Clock3 className="text-blue-700" size={20} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">Order Date</h3>
                    <p className="text-xs text-slate-500">Shipment details</p>
                  </div>
                </div>

                <p className="mt-5 text-xl font-bold text-slate-900 sm:text-2xl">
                  {shipment.date}
                </p>

                <div className="mt-5 border-t border-blue-100 pt-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Estimated arrival
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    An estimated arrival time has not been recorded for this order.
                  </p>
                </div>
              </div>
            </div>

            {/* Live map */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Live Delivery Map
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    View the latest reported location of your delivery.
                  </p>
                </div>

                {location &&
                  Number.isFinite(Number(location.latitude)) &&
                  Number.isFinite(Number(location.longitude)) && (
                    <div className="flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Location available
                    </div>
                  )}
              </div>

              {location &&
              Number.isFinite(Number(location.latitude)) &&
              Number.isFinite(Number(location.longitude)) ? (
                <MapContainer
                  center={[
                    Number(location.latitude),
                    Number(location.longitude),
                  ]}
                  zoom={15}
                  minZoom={3}
                  maxZoom={19}
                  scrollWheelZoom={true}
                  zoomControl={true}
                  style={{
                    height: "clamp(280px, 48vh, 520px)",
                    width: "100%",
                    zIndex: 0,
                  }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                  />

                  <Marker
                    position={[
                      Number(location.latitude),
                      Number(location.longitude),
                    ]}
                  >
                    <Popup>
                      <div className="space-y-1">
                        <p className="font-semibold">Current delivery location</p>
                        <p>Latitude: {location.latitude}</p>
                        <p>Longitude: {location.longitude}</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center bg-slate-50 px-5 py-12 text-center">
                  <MapPin className="mb-3 text-slate-400" size={36} />
                  <p className="font-semibold text-slate-700">
                    No delivery location yet
                  </p>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    The map will appear when the delivery agent shares their first location.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <span>Map data © OpenStreetMap contributors</span>
                <span>Use + / − or pinch to zoom</span>
              </div>
            </div>
          </section>


          {/* ==================================================
              SECTION 12: SHIPMENT PROGRESS TIMELINE
              Purpose: Show completed and pending delivery milestones
              ================================================== */}
          {/* Shipment progress */}
          <div className="border-t border-slate-100 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900">
              Shipment progress
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your current status is based on the order record.
            </p>

            <div className="mt-8">
              {events.map((item, index) => {
                const isCurrent =
                  (shipment.status === "Pending" && index === 0) ||
                  (shipment.status === "In Transit" && index === 2) ||
                  (shipment.status === "Delivered" && index === 4);

                return (
                  <div
                    key={item.title}
                    className="relative flex gap-4 pb-8 last:pb-0"
                  >
                    {index !== events.length - 1 && (
                      <div
                        className={`absolute left-4 top-9 h-[calc(100%-12px)] w-0.5 ${
                          item.completed ? "bg-blue-200" : "bg-slate-200"
                        }`}
                      />
                    )}

                    <div
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        item.completed
                          ? "bg-blue-600 text-white"
                          : "border-2 border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {item.completed ? (
                        <CheckCircle2 size={19} />
                      ) : (
                        <Clock3 size={17} />
                      )}
                    </div>

                    <div className="flex-1 pt-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h3
                          className={`font-semibold ${
                            isCurrent
                              ? "text-blue-700"
                              : item.completed
                                ? "text-slate-900"
                                : "text-slate-500"
                          }`}
                        >
                          {item.title}
                          {isCurrent ? " · Current status" : ""}
                        </h3>

                        <span className="text-xs text-slate-500">
                          {item.completed
                            ? shipment.date
                            : "Awaiting update"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <p className="mt-5 text-center text-xs text-slate-500">
          Demo tracking · Live location, delivery events, and ETA require
          backend integration.
        </p>
      </div>
    </main>
  );
}

// ==================================================
// SECTION 13: EXPORT COMPONENT
// Purpose: Make Tracking available to the app router
// ==================================================

export default Tracking;
