import { Package, Truck, MapPin } from "lucide-react";

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 bg-white py-6 sm:py-8"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-lg font-semibold text-blue-600">
            Simple workflow
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            From order to delivery
          </h2>

          <p className="mt-3 text-base leading-7 text-slate-600">
            Manage every delivery through a clear, connected workflow.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-8 grid gap-5 md:grid-cols-3">

          {/* Step 1 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Package size={24} />
            </div>

            <p className="mt-5 text-sm font-semibold text-blue-600">
              STEP 01
            </p>

            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              Create an order
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Register a shipment with customer details, destination, and tracking information.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Truck size={24} />
            </div>

            <p className="mt-5 text-sm font-semibold text-blue-600">
              STEP 02
            </p>

            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              Assign and dispatch
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Prepare each order for dispatch and keep delivery operations organized.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <MapPin size={24} />
            </div>

            <p className="mt-5 text-sm font-semibold text-blue-600">
              STEP 03
            </p>

            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              Track to delivery
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Monitor delivery progress and receive status updates until the order arrives.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;