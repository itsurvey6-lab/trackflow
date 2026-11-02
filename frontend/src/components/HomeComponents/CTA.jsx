import { useNavigate } from "react-router-dom";

function CTA() {

  const navigate = useNavigate();

  return (
    <section className="bg-white pt-2 pb-6 sm:pt-3 sm:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* CTA Container */}
        <div className="relative overflow-hidden rounded-3xl bg-blue-600 px-6 py-10 sm:px-10 sm:py-12 lg:px-14">

          {/* Content */}
          <div className="relative z-10 max-w-2xl">

            <p className="text-sm font-semibold text-blue-100">
              Simplify your logistics
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to take control of your deliveries?
            </h2>

            <p className="mt-4 text-base leading-7 text-blue-100">
              Bring order management, delivery tracking, and operations
              together with TrackFlow.
            </p>

            {/* CTA Buttons */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">

              <button
                type="button"
                onClick={() => navigate("/tracking")}
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
              >
                Start Tracking
              </button>

              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Explore Features
              </a>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}

export default CTA;