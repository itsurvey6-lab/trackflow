import { useEffect, useRef, useState } from "react";
import { Camera, UserCircle } from "lucide-react";

function Profile() {

  const user = JSON.parse(
    localStorage.getItem("trackflow_user") || "null"
  );

  const [displayName, setDisplayName] = useState(
    user?.full_name || user?.name || "User"
  );

  const [fullName, setFullName] = useState(
    user?.full_name || user?.name || ""
  );

  const [phone, setPhone] = useState(user?.phone || "");

  const [city, setCity] = useState(user?.city || "");
  const [address, setAddress] = useState(user?.address || "");

  const fileInputRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const token = localStorage.getItem("trackflow_token");

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/users/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load profile");
        }

        const profile = data.user;

        console.log("Loaded profile:", profile);

        localStorage.setItem("trackflow_user", JSON.stringify(profile));
        setFullName(profile.full_name || "");
        setDisplayName(profile.full_name || profile.name || "User");
        setPhone(profile.phone || "");
        setCity(profile.city || "");
        setAddress(profile.address || "");  
        setAvatarUrl(profile.avatar_url || "");
      } catch (error) {
        console.error("Profile loading error:", error.message);
      }
    }

    loadProfile();
  }, []);

  async function handleSave() {
    const token = localStorage.getItem("trackflow_token");

    try {
        const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/me`,
        {
            method: "PUT",
            headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              full_name: fullName,
              phone: phone,
              city: city,
              address: address,
            }),
        }
        );

        const data = await response.json();

        if (!response.ok) {
        throw new Error(data.message || "Failed to save profile");
        }

        localStorage.setItem("trackflow_user", JSON.stringify(data.user));
        setDisplayName(data.user.full_name || data.user.name || "User");
        setFullName(data.user.full_name || "");
        setPhone(data.user.phone || "");
        setCity(data.user.city || "");
        setAddress(data.user.address || "");

        window.dispatchEvent(new Event("trackflow-user-updated"));
        alert("Profile updated successfully!");
    } catch (error) {
        alert(error.message || "Could not save profile.");
    }
    }

  
  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Please select a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("The image must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }

    const token = localStorage.getItem("trackflow_token");
    const formData = new FormData();
    formData.append("avatar", file);

    setUploading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/me/avatar`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Photo upload failed");
      }

      // Update saved user information
      localStorage.setItem("trackflow_user", JSON.stringify(data.user));

      // Update the profile page immediately
      setAvatarUrl(data.user.avatar_url || "");
      setDisplayName(data.user.full_name || data.user.name || "User");

      // Update the dashboard profile icon
      window.dispatchEvent(new Event("trackflow-user-updated"));

      alert("Profile picture updated successfully!");
    } catch (error) {
      alert(error.message || "Could not upload profile picture.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }


  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
      <div className="space-y-6">  
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View and manage your personal information.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
            
            
            <div className="relative size-32 shrink-0 sm:size-36">
              <div className="flex size-32 items-center justify-center overflow-hidden rounded-full border-4 border-blue-100 bg-blue-50 text-3xl font-bold text-blue-700 shadow-sm sm:size-36">
                {avatarUrl ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL}${avatarUrl}`}
                    alt="Profile picture"
                    className="size-full object-cover"
                  />
                ) : (
                  initials || <UserCircle size={32} />
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Change profile picture"
                className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Camera size={14} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>



            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {displayName}
              </h2>
              <p className="text-sm capitalize text-slate-500">
                {(user?.role || "user").replaceAll("_", " ")}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600"
              />
            </div>

            
            <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
                Phone number
            </label>
            <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            </div>

                        
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                City / Service Area
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter your city or service area"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Address (optional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your address"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                type="email"
                value={user?.email || ""}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600"
              />
            </div>


            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Role
              </label>
              <input
                type="text"
                value={(user?.role || "user").replaceAll("_", " ")}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 capitalize text-slate-600"
              />
            </div>

            <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
                Save Changes
            </button>
          </div>

           </div>
      </div>
  );
}

export default Profile;