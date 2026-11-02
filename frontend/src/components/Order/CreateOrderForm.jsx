
import { useEffect, useState } from "react";
import {
  X,
  PackagePlus,
  UserRound,
  MapPin,
  Package,
  ArrowRight,
  LoaderCircle,
} from "lucide-react";

function CreateOrderForm({ onClose, onCreate }) {
  
  const savedUser = JSON.parse(
    localStorage.getItem("trackflow_user") || "null"
  );


  const isAdmin = savedUser?.role === "admin";

  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState("");

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    async function loadCustomers() {
      setCustomersLoading(true);
      setCustomersError("");

      try {
        const token = localStorage.getItem("trackflow_token");

        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load customers.");
        }

        const users = Array.isArray(data.users) ? data.users : [];

        const activeCustomers = users.filter(
          (user) =>
            user.role === "customer" &&
            user.is_active !== false
        );

        if (!cancelled) {
          setCustomers(activeCustomers);
        }
      } catch (error) {
        if (!cancelled) {
          setCustomersError(error.message || "Could not load customers.");
        }
      } finally {
        if (!cancelled) {
          setCustomersLoading(false);
        }
      }
    }

    loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const [formData, setFormData] = useState({
    customerName: savedUser?.full_name || savedUser?.name || "",
    phone: savedUser?.phone || "",
    pickupAddress: [savedUser?.address, savedUser?.city]
      .filter(Boolean)
      .join(", "),
    recipientName: "",
    recipientPhone: "",
    destination: "",
    packageDescription: "",
    specialInstructions: "",
  });


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  const labelClass =
    "mb-2 block text-sm font-medium text-slate-700";

  const SectionHeading = ({ icon: Icon, title, description }) => (
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
        <Icon size={19} />
      </div>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const result = await onCreate({
        customer_id: isAdmin ? Number(selectedCustomerId) : undefined,
        customer_name: formData.customerName.trim(),
        phone: formData.phone.trim(),
        pickup_address: formData.pickupAddress.trim(),
        recipient_name: formData.recipientName.trim(),
        recipient_phone: formData.recipientPhone.trim(),
        dropoff_address: formData.destination.trim(),
        package_description: formData.packageDescription.trim(),
        special_instructions: formData.specialInstructions.trim(),
      });

      if (result?.success) {
        onClose();
      } else {
        setSubmitError(
          result?.message || "Could not create the delivery request."
        );
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-order-title"
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-3 text-white shadow-sm">
              <PackagePlus size={22} />
            </div>
            <div>
              <h2
                id="create-order-title"
                className="text-lg font-bold text-slate-900 sm:text-xl"
              >
                Create New Delivery
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Tell us where to collect and deliver your parcel.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close form"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-7">
            {submitError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {submitError}
              </div>
            )}

            <section>
              <SectionHeading
                icon={UserRound}
                title="Sender details"
                description={
                  isAdmin
                    ? "Select the customer who owns this delivery."
                    : "Your contact details for this pickup."
                }
              />

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Customer name / customer selection */}
                <div>
                  <label className={labelClass} htmlFor="customerName">
                    Customer <span className="text-red-500">*</span>
                  </label>

                  {isAdmin ? (
                    <>
                      <select
                        id="customerName"
                        value={selectedCustomerId}
                        required
                        disabled={customersLoading}
                        onChange={(event) => {
                          const customerId = event.target.value;
                          const customer = customers.find(
                            (item) => String(item.id) === customerId
                          );

                          setSelectedCustomerId(customerId);

                          setFormData((previous) => ({
                            ...previous,
                            customerName: customer?.full_name || "",
                            phone: customer?.phone || "",
                          }));
                        }}
                        className={inputClass}
                      >
                        <option value="">
                          {customersLoading
                            ? "Loading customers..."
                            : "Select a customer"}
                        </option>

                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.full_name} — {customer.email}
                          </option>
                        ))}
                      </select>

                      {customersError && (
                        <p className="mt-2 text-sm text-red-600">
                          {customersError}
                        </p>
                      )}

                      {!customersLoading &&
                        !customersError &&
                        customers.length === 0 && (
                          <p className="mt-2 text-sm text-amber-700">
                            No active customers are available.
                          </p>
                        )}
                    </>
                  ) : (
                    <input
                      id="customerName"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      required
                      maxLength={120}
                      className={inputClass}
                    />
                  )}
                </div>

                {/* Mobile number */}
                <div>
                  <label className={labelClass} htmlFor="phone">
                    Mobile number <span className="text-red-500">*</span>
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter your contact number"
                    required
                    maxLength={30}
                    className={inputClass}
                  />
                </div>
              </div>
            </section>
            <section className="border-t border-slate-100 pt-6">
              <SectionHeading
                icon={MapPin}
                title="Pickup address"
                description="Where should the delivery agent collect the parcel?"
              />

              <label className={labelClass} htmlFor="pickupAddress">
                Full pickup address <span className="text-red-500">*</span>
              </label>
              <textarea
                id="pickupAddress"
                name="pickupAddress"
                autoComplete="street-address"
                value={formData.pickupAddress}
                onChange={handleChange}
                placeholder="Building / villa, street, zone or area, city, and any helpful directions"
                required
                maxLength={1000}
                rows={3}
                className={`${inputClass} resize-y`}
              />
              <p className="mt-2 text-xs text-slate-500">
                Include your building number and a nearby landmark if helpful.
              </p>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <SectionHeading
                icon={MapPin}
                title="Delivery destination"
                description="Who will receive the parcel, and where?"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="recipientName">
                    Recipient name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="recipientName"
                    name="recipientName"
                    autoComplete="off"
                    value={formData.recipientName}
                    onChange={handleChange}
                    placeholder="Person receiving the parcel"
                    required
                    maxLength={120}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="recipientPhone">
                    Recipient mobile <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="recipientPhone"
                    name="recipientPhone"
                    type="tel"
                    autoComplete="off"
                    value={formData.recipientPhone}
                    onChange={handleChange}
                    placeholder="Recipient's contact number"
                    required
                    maxLength={30}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className={labelClass} htmlFor="destination">
                  Full delivery address <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="destination"
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  placeholder="Building / villa, street, zone or area, city, and any helpful directions"
                  required
                  maxLength={1000}
                  rows={3}
                  className={`${inputClass} resize-y`}
                />
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <SectionHeading
                icon={Package}
                title="Parcel information"
                description="Help the delivery agent understand what is being collected."
              />

              <div>
                <label className={labelClass} htmlFor="packageDescription">
                  Package description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="packageDescription"
                  name="packageDescription"
                  value={formData.packageDescription}
                  onChange={handleChange}
                  placeholder="For example, documents, clothing, or a small box"
                  required
                  maxLength={1000}
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </div>

              <div className="mt-4">
                <label className={labelClass} htmlFor="specialInstructions">
                  Special instructions{" "}
                  <span className="font-normal text-slate-400">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="specialInstructions"
                  name="specialInstructions"
                  value={formData.specialInstructions}
                  onChange={handleChange}
                  placeholder="Gate access, when to call, or other delivery directions"
                  maxLength={1000}
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </div>
            </section>

            <p className="text-xs text-slate-500">
              Fields marked <span className="text-red-500">*</span> are
              required. Please check the addresses and contact numbers before
              submitting.
            </p>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Delivery Request
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateOrderForm;
