

import {
  Package,
  MapPin,
  Truck,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";


const features = [
  {
    icon: Package,
    title: "Order Management",
    description:
      "Create, organize, and manage delivery orders from one central dashboard.",
  },
  {
    icon: MapPin,
    title: "Real-Time Tracking",
    description:
      "Track shipment status and view delivery progress from order creation to delivery.",
  },
  {
    icon: Truck,
    title: "Agent Dispatching",
    description:
      "Assign deliveries to agents and keep daily operations organized.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description:
      "Track delivery performance and identify opportunities to improve efficiency.",
  },
];

function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-20 bg-slate-50 py-6 sm:py-8"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-lg font-semibold text-blue-600">
            Powerful delivery tools
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to manage deliveries
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600">
            TrackFlow brings orders, delivery operations, and real-time
            tracking together in one simple platform.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
                const Icon = feature.icon;

                return (
                <div
                    key={feature.title}
                    className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/50"
                >                                                                 
                    {/* Icon */}
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors duration-300 group-hover:bg-blue-600 group-hover:text-white">
                    <Icon size={23} strokeWidth={1.8} />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-slate-900">
                    {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                    {feature.description}
                    </p>

                    {/* Decorative Arrow */}
                    <div className="mt-5 flex justify-end text-slate-400 transition-colors group-hover:text-blue-600">
                    <ArrowUpRight size={18} />
                    </div>
                </div>
                );
            })}
            </div>

      </div>
    </section>
  );
}

export default Features;