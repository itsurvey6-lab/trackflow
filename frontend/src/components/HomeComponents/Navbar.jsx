import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  MapPin,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";



// Navigation links

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Tracking", href: "#tracking" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "About", href: "#about" },
];

// Reusable Tailwind classes

const navLinkClass =
  "rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-blue-600";

const mobileLinkClass =
  "block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600";


  // function starts

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">

      {/* Navbar Container */}

      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Brand */}
        <a
          href="/"
          className="group flex items-center gap-3"
          onClick={closeMenu}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:bg-blue-700 group-hover:shadow-md">
            <MapPin size={21} strokeWidth={2.4} />
          </span>

          <span className="text-xl font-bold tracking-tight text-slate-900">
            Track<span className="text-blue-600">Flow</span>
          </span>
        </a>

        {/* Desktop Navigation */}

        <div className="hidden items-center gap-1 lg:flex">

          {navLinks.map((link) => (

            <a
              key={link.href}
              href={link.href}
              className={navLinkClass}
            >
              {link.label}
            </a>

          ))}
        </div>

        
        {/* Desktop Actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => navigate("/register")}
            className="group flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md"
          >
            Get Started

            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </button>
        </div>


        {/* Mobile Menu Button */}
        
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>

      </div>

      {/* Mobile Navigation */}
      <div
        className={`overflow-hidden border-t border-slate-100 bg-white transition-all duration-300 lg:hidden ${
          menuOpen
            ? "max-h-[500px] opacity-100"
            : "max-h-0 opacity-0"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">

          {/* Mobile Links */}
          <div className="space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className={mobileLinkClass}
              >
                {link.label}
              </a>
            ))}
          </div>

          
          {/* Mobile Actions */}
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => {
                closeMenu();
                navigate("/login");
              }}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                navigate("/register");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md"
            >
              Get Started
              <ArrowRight size={16} />
            </button>
          </div>


        </div>
      </div>

    </nav>
  );
}

export default Navbar;
