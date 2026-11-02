
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, MapPin, ArrowRight } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed. Please try again.");
      }

      if (data.status !== "success" || !data.token || !data.user) {
        throw new Error("The server returned an unexpected login response.");
      }

      // Save the authentication details for subsequent API requests.
      localStorage.setItem("trackflow_token", data.token);
      localStorage.setItem("trackflow_user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("trackflow-auth-changed"));

      // Navigate according to the role returned by the backend.
      switch (data.user.role) {
        case "admin":
          navigate("/dashboard", { replace: true });
          break;

        case "delivery_agent":
          navigate("/dashboard", { replace: true });
          break;

        case "customer":
          navigate("/dashboard", { replace: true });
          break;

        default:
          localStorage.removeItem("trackflow_token");
          localStorage.removeItem("trackflow_user");
          setError("Your account has an unsupported role. Please contact support.");
      }
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Unable to connect to the server. Check that the backend is running and try again."
        );
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 md:grid-cols-2">
        {/* Brand Panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-blue-600 p-10 text-white md:flex lg:p-12">
          <div className="absolute -right-20 -top-20 size-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 -left-20 size-72 rounded-full bg-blue-400/30 blur-2xl" />

          <Link to="/" className="relative flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/15">
              <MapPin size={24} />
            </span>
            <span className="text-xl font-bold tracking-tight">TrackFlow</span>
          </Link>

          <div className="relative my-12">
            <p className="text-sm font-semibold text-blue-100">
              DELIVERY MANAGEMENT, SIMPLIFIED
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight lg:text-5xl">
              Every delivery.
              <br />
              Under control.
            </h1>
            <p className="mt-5 max-w-sm leading-7 text-blue-100">
              Manage orders and follow shipment progress through one
              simple, organized workspace.
            </p>
          </div>

          <p className="relative text-sm text-blue-100">
            Your deliveries, organized with TrackFlow.
          </p>
        </section>

        {/* Login Form */}
        <section className="p-6 sm:p-10 lg:p-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-lg font-bold text-slate-900 md:hidden"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <MapPin size={20} />
            </span>
            TrackFlow
          </Link>

          <div className="mt-8 sm:mt-4">
            <p className="text-sm font-semibold text-blue-600">
              Welcome back
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Sign in to your account
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Enter your details to continue to TrackFlow.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 transition hover:text-slate-800"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Signing in..." : "Sign In"}
              {!isLoading && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-blue-600 transition hover:text-blue-700"
            >
              Create account
            </Link>
          </p>

          <p className="mt-8 text-center text-xs leading-5 text-slate-500">
            By continuing, you agree to use TrackFlow responsibly.
          </p>
        </section>
      </div>
    </main>
  );
}

export default Login;
