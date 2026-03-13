import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  useCurrentUser,
  useUpdateProfile,
  useChangePassword,
} from "../../../api/auth";
import toast from "../../../lib/toast";
import { formatPhoneNumber } from "../../../lib/formatters";

export default function ProfileScreen() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || (user as any).name || "");
      setPhoneNumber((user as any).phoneNumber || "");
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!fullName.trim()) {
        toast.error("Full name is required");
        return;
      }
      if (!phoneNumber.trim()) {
        toast.error("Phone number is required");
        return;
      }
      const digits = phoneNumber.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15) {
        toast.error("Phone number must be between 7 and 15 digits");
        return;
      }
      await updateProfile.mutateAsync({ fullName, phoneNumber });
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    try {
      await changePassword.mutateAsync({
        oldPassword,
        newPassword,
        confirmPassword,
      });
      toast.success("Password changed successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    }
  };

  if (userLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto font-mono text-zinc-900 animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-12 border-b-2 border-zinc-900 pb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">
            Account Identity
          </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
            <Shield size={14} className="text-emerald-500" /> Secure Terminal
            Access | {user?.role} Node
          </p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
            Access Token ID
          </p>
          <p className="text-xs font-bold font-mono">
            {user?.id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Side: Avatar & Basic Stats */}
        <div className="lg:col-span-4 space-y-8">
          <div className="border-2 border-zinc-900 p-8 text-center bg-zinc-50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2">
              <div className="w-2 h-2 border-t border-r border-zinc-300"></div>
            </div>
            <div className="w-32 h-32 bg-zinc-900 mx-auto flex items-center justify-center text-white text-5xl font-black mb-6 border-4 border-white shadow-xl group-hover:scale-105 transition-transform">
              {(fullName || "U").charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight mb-1">
              {fullName}
            </h2>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-1 bg-zinc-100 inline-block border border-zinc-200">
              {user?.role} PORTAL
            </p>

            <div className="mt-8 pt-8 border-t border-zinc-200 flex justify-center gap-8">
              <div className="text-center">
                <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest mb-1">
                  Status
                </p>
                <p className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{" "}
                  Active
                </p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest mb-1">
                  Encryption
                </p>
                <p className="text-[10px] font-bold uppercase">AES-256</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 text-white p-6 border-b-4 border-emerald-500">
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-50 flex items-center gap-2">
              <AlertCircle size={12} /> Security Notice
            </h3>
            <p className="text-[11px] font-bold leading-relaxed uppercase opacity-80">
              Session is encrypted and logged. Always log out when exiting the
              clinical terminal to prevent unauthorized data access.
            </p>
          </div>
        </div>

        {/* Right Side: Forms */}
        <div className="lg:col-span-8 space-y-12">
          {/* Profile Form */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-zinc-100 border border-zinc-200">
                <User size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  Identity Parameters
                </h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Update your core profile information
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Full Name
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                      size={16}
                    />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-zinc-50 border-2 border-zinc-200 px-12 py-3 text-xs font-bold focus:outline-none focus:border-zinc-900 focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Phone Signal
                  </label>
                  <div className="relative">
                    <Phone
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                      size={16}
                    />
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                      className="w-full bg-zinc-50 border-2 border-zinc-200 px-12 py-3 text-xs font-bold focus:outline-none focus:border-zinc-900 focus:bg-white transition-all"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Email Vector (Immutable)
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                    size={16}
                  />
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full bg-zinc-100 border-2 border-zinc-200 px-12 py-3 text-xs font-bold text-zinc-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="bg-zinc-900 text-white px-8 py-4 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-zinc-800 transition-all disabled:opacity-50"
              >
                {updateProfile.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                SYNC IDENTITY DATA
              </button>
            </form>
          </section>

          {/* Password Form Toggle */}
          <section className="border-t-2 border-zinc-100 pt-12">
            {!showPasswordForm ? (
              <div className="bg-zinc-50 border-2 border-zinc-200 p-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white border border-zinc-200">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">
                      Security Credentials
                    </h3>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                      Update your terminal access password
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-6 py-3 border-2 border-zinc-900 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all"
                >
                  INITIALIZE PASSWORD RESET
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleChangePassword}
                className="space-y-8 animate-in slide-in-from-top-4 duration-500"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-900 text-white">
                      <Lock size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900">
                        Credential Update
                      </h3>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        Provide current and new password vectors
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(false)}
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
                  >
                    CANCEL
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      Current Password
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                        size={16}
                      />
                      <input
                        type={showOldPassword ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                        className="w-full bg-zinc-50 border-2 border-zinc-200 px-12 py-3 text-xs font-bold focus:outline-none focus:border-zinc-900 focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900"
                      >
                        {showOldPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        New Password Vector
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="w-full bg-zinc-50 border-2 border-zinc-200 px-6 py-3 text-xs font-bold focus:outline-none focus:border-zinc-900 focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900"
                        >
                          {showNewPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        Confirm New Vector
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full bg-zinc-50 border-2 border-zinc-200 px-6 py-3 text-xs font-bold focus:outline-none focus:border-zinc-900 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <button
                    type="submit"
                    disabled={changePassword.isPending}
                    className="bg-zinc-900 text-white px-10 py-4 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-zinc-800 transition-all disabled:opacity-50"
                  >
                    {changePassword.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    REWRITE ACCESS KEYS
                  </button>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                    Password must be at least 8 characters with high entropy.
                  </p>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
