import {
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  Truck,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

function TrackingPreview() {

    const navigate = useNavigate();
  return (
    <section
    id="tracking"
    className="scroll-mt-20 bg-slate-50 pt-6 pb-2 sm:pt-8 sm:pb-3"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-blue-600">
            Live shipment visibility
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Every delivery, in view
          </h2>

          <p className="mt-3 text-base leading-7 text-slate-600">
            Follow shipment progress, review delivery details, and stay
            informed throughout the journey.
          </p>
        </div>

        {/* Tracking Dashboard Preview */}
        <div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/40">

        {/* Dashboard Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
            <p className="text-sm text-slate-500">
                Shipment tracking
            </p>

            <h3 className="mt-1 text-lg font-semibold text-slate-900">
                Order #TF-2048
            </h3>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            In Transit
            </span>
        </div>

        {/* Dashboard Content */}
        <div className="grid md:grid-cols-2">

            {/* Shipment Details */}
            <div className="p-5 sm:p-6">

            <h4 className="text-sm font-semibold text-slate-900">
                Delivery progress
            </h4>

            {/* Timeline */}
            <div className="mt-6 space-y-6">

                {/* Step 1 */}
                <div className="flex gap-4">
                <div className="flex flex-col items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={19} />
                    </div>
                    <div className="mt-2 h-8 w-px bg-emerald-200" />
                </div>

                <div className="pb-2">
                    <p className="text-sm font-semibold text-slate-900">
                    Order placed
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                    Shipment registered successfully
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                    Step completed
                    </p>
                </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                <div className="flex flex-col items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Truck size={19} />
                    </div>
                    <div className="mt-2 h-8 w-px bg-slate-200" />
                </div>

                <div className="pb-2">
                    <p className="text-sm font-semibold text-slate-900">
                    In transit
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                    Package is on its way to the destination
                    </p>
                    <p className="mt-1 text-xs font-medium text-blue-600">
                    Current status
                    </p>
                </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400">
                    <MapPin size={19} />
                </div>

                <div>
                    <p className="text-sm font-semibold text-slate-700">
                    Delivered
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                    Awaiting successful delivery
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                    Pending
                    </p>
                </div>
                </div>

            </div>
            </div>

            {/* Delivery Information */}
            <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6 md:border-l md:border-t-0">

            <h4 className="text-sm font-semibold text-slate-900">
                Shipment information
            </h4>

            {/* Tracking ID */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Package size={20} />
                </div>

                <div>
                    <p className="text-xs text-slate-500">
                    Tracking number
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                    TF-2026-2048
                    </p>
                </div>
                </div>
            </div>

            {/* Destination */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                <MapPin size={20} className="mt-0.5 shrink-0 text-blue-600" />

                <div>
                    <p className="text-xs text-slate-500">
                    Destination
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                    Customer delivery address
                    </p>
                </div>
                </div>
            </div>

            {/* Estimated Arrival */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                <Clock size={20} className="mt-0.5 shrink-0 text-blue-600" />

                <div>
                    <p className="text-xs text-slate-500">
                    Estimated arrival
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                    Pending live tracking
                    </p>
                </div>
                </div>
            </div>

            {/* Demo Notice */}
            <p className="mt-4 text-xs leading-5 text-slate-500">
                This is a sample shipment preview. Live location and delivery
                estimates will be connected to the backend later.
            </p>

            
            <button
            type="button"
            onClick={() => navigate("/tracking/TF-2048")}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
            View Shipment Details
            </button>


            </div>
        </div>
        </div>

      </div>
    </section>
  );
}

export default TrackingPreview;