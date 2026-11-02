import { MapPin } from "lucide-react";

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Brand and Description */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-slate-900"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <MapPin size={20} />
            </span>
            TrackFlow
          </a>

          <p className="max-w-md text-sm leading-6 text-slate-600 sm:text-right">
            A simpler way to manage orders, monitor deliveries, and keep
            shipment information organized.
          </p>
        </div>

        {/* Footer Bottom */}
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} TrackFlow. All rights reserved.
          </p>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-5 gap-y-2"
          >
            <a href="#features" className="text-slate-600">
              Features
            </a>

            <a href="#tracking" className="text-slate-600">
              Tracking
            </a>

            <a href="#about" className="text-slate-600">
              About
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default Footer;