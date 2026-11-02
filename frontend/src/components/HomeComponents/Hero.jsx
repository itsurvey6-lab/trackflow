
import {
  ArrowRight,
  MapPin,
  Play,
  CheckCircle2,
} from "lucide-react";

function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-50">

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-50 blur-3xl" />
      </div>

   
      {/* Hero Container */}
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-10 sm:px-6 sm:pb-8 sm:pt-12 lg:px-8 lg:pb-10 lg:pt-16">

        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">

          {/* ==================== LEFT CONTENT ==================== */}
          <div className="max-w-2xl">

            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-2 text-sm font-medium text-blue-700">
              <span className="flex h-2 w-2 rounded-full bg-blue-600" />
              Real-time delivery management
            </div>

            {/* Heading */}
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Deliver smarter.
              <span className="block text-blue-600">
                Track everything.
              </span>
            </h1>

            {/* Description */}
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              TrackFlow gives businesses a simple way to manage orders,
              monitor deliveries in real time, and keep customers informed
              from pickup to doorstep.
            </p>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">

              <button
                type="button"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/25"
              >
                Start Tracking
                <ArrowRight
                  size={17}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </button>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
              >
                <Play size={16} />
                See how it works
              </button>

            </div>

            {/* Benefits */}
            <div className="mt-8 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:gap-6">

              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={17}
                  className="text-blue-600"
                />
                Real-time updates
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={17}
                  className="text-blue-600"
                />
                Simple management
              </div>

            </div>

          </div>


          {/* ==================== RIGHT VISUAL ==================== */}
          <div className="relative">

            {/* Main Tracking Card */}
            <div className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/60 sm:p-6">

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Shipment Status
                  </p>

                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    Shipment #TRK-2026-2048
                  </h2>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  In Transit
                </span>

              </div>


              {/* Map Preview */}
              <div className="relative mt-5 h-56 overflow-hidden rounded-2xl bg-slate-100">

                {/* Map Grid */}
                <div className="absolute inset-0 opacity-60">
                  <div className="absolute left-[15%] top-0 h-full w-px bg-slate-300" />
                  <div className="absolute left-[42%] top-0 h-full w-px rotate-12 bg-slate-300" />
                  <div className="absolute left-[70%] top-0 h-full w-px -rotate-12 bg-slate-300" />

                  <div className="absolute left-0 top-[30%] h-px w-full rotate-6 bg-slate-300" />
                  <div className="absolute left-0 top-[65%] h-px w-full -rotate-6 bg-slate-300" />
                </div>

                {/* Route */}
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 500 220"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M70 170 C150 150, 170 70, 260 105 S380 160, 440 55"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray="8 8"
                    className="text-blue-500"
                  />
                </svg>

                {/* Starting Point */}
                <div className="absolute left-[12%] top-[72%] flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-slate-700 shadow-md">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </div>

                {/* Current Location */}
                <div className="absolute left-[50%] top-[43%]">
                  <div className="absolute -inset-3 animate-ping rounded-full bg-blue-400/30" />

                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white shadow-lg">
                    <MapPin size={18} />
                  </div>
                </div>

                {/* Destination */}
                <div className="absolute right-[9%] top-[17%] flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-emerald-500 shadow-md">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </div>

              </div>


              {/* Delivery Information */}

                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-medium text-blue-700">
                        Driver is currently en route to the destination.
                    </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Current location
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    Regional Distribution Center
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Estimated Arrival
                   </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                    ETA: 18 mins
                    </p>
                </div>

              </div>

            </div>
            

          </div>

        </div>

      </div>

    </section>
  );
}

export default Hero;
