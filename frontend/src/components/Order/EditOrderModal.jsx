
import { useState } from "react";
import { X, Save, Package } from "lucide-react";

function EditOrderModal({ order, onClose, onSave }) {
  const [formData, setFormData] = useState({
    id: order.id,
    pickup_address: order.pickup_address || "",
    dropoff_address: order.dropoff_address || "",
    sender_phone: order.sender_phone || "",
    recipient_name: order.recipient_name || "",
    recipient_phone: order.recipient_phone || "",
    package_description: order.package_description || "",
    special_instructions: order.special_instructions || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const result = await onSave(formData);

      if (!result?.success) {
        setError(result?.message || "Could not save the order.");
        return;
      }

      onClose();
    } catch (err) {
      setError(err.message || "Could not save the order.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-order-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Package size={22} />
            </div>

            <div>
              <h2
                id="edit-order-title"
                className="text-xl font-bold text-slate-900"
              >
                Edit Order
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Update shipment {order.id}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close edit form"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Customer
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {order.customerName || "Customer"} (account details are not changed here)
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-pickup" className="mb-2 block text-sm font-medium text-slate-700">
                Pickup Address
              </label>
              <input
                id="edit-pickup"
                name="pickup_address"
                value={formData.pickup_address}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="edit-dropoff" className="mb-2 block text-sm font-medium text-slate-700">
                Destination
              </label>
              <input
                id="edit-dropoff"
                name="dropoff_address"
                value={formData.dropoff_address}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="edit-sender-phone" className="mb-2 block text-sm font-medium text-slate-700">
                Sender Phone
              </label>
              <input
                id="edit-sender-phone"
                name="sender_phone"
                type="tel"
                value={formData.sender_phone}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="edit-recipient-name" className="mb-2 block text-sm font-medium text-slate-700">
                Recipient Name
              </label>
              <input
                id="edit-recipient-name"
                name="recipient_name"
                value={formData.recipient_name}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="edit-recipient-phone" className="mb-2 block text-sm font-medium text-slate-700">
                Recipient Phone
              </label>
              <input
                id="edit-recipient-phone"
                name="recipient_phone"
                type="tel"
                value={formData.recipient_phone}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-package" className="mb-2 block text-sm font-medium text-slate-700">
              Package Description
            </label>
            <textarea
              id="edit-package"
              name="package_description"
              value={formData.package_description}
              onChange={handleChange}
              rows={3}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="edit-instructions" className="mb-2 block text-sm font-medium text-slate-700">
              Special Instructions
            </label>
            <textarea
              id="edit-instructions"
              name="special_instructions"
              value={formData.special_instructions}
              onChange={handleChange}
              rows={3}
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={17} />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditOrderModal;
