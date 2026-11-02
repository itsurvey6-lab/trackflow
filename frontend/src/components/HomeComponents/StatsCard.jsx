function Stats() {

  const stats = [
    {
      value: "15K+",
      label: "Orders Delivered",
    },
    {
      value: "98%",
      label: "On-Time Rate",
    },
    {
      value: "120+",
      label: "Delivery Agents",
    },
    {
      value: "24/7",
      label: "Live Tracking",
    },
  ];

  return (
    <section className="bg-white py-6 sm:py-8">

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">

          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >

              <h3 className="text-3xl font-bold text-blue-600">
                {stat.value}
              </h3>

              <p className="mt-2 text-sm font-medium text-slate-600">
                {stat.label}
              </p>

            </div>
          ))}

        </div>

      </div>

    </section>
  );
}

export default Stats;