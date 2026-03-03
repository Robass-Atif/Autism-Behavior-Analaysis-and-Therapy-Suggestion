import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "@tanstack/react-router";
import { UserStatus } from "../../../types";
import { useLogin, useResendVerification } from "../../../api/auth";
import toast from "react-hot-toast";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  Activity,
  Shield,
  Key,
  Loader2,
  AlertTriangle,
  Clock,
  XCircle,
  UserX,
  Send,
} from "lucide-react";

// Zod Schema for Validation
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | string | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useLogin();
  const resendMutation = useResendVerification();

  const handleResendVerification = async () => {
    const email = getValues("email");
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }

    try {
      await resendMutation.mutateAsync(email);
      toast.success("Verification email resent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend verification email");
    }
  };

  const onSubmit = (data: LoginFormInputs) => {
    setLoginError(null);
    setUserStatus(null);

    loginMutation.mutate(
      { email: data.email, password: data.password },
      {
        onSuccess: (response: any) => {
          const userData = response.data || response.user || response;
          const status = (
            userData?.accountStatus ||
            userData?.status ||
            ""
          ).toLowerCase();

          if (status === "pending" || status === "pending_approval") {
            setUserStatus(UserStatus.PENDING_APPROVAL);
            setLoginError("Account pending approval");
            return;
          }

          if (status === "rejected") {
            setUserStatus(UserStatus.REJECTED);
            setLoginError("Account application rejected");
            return;
          }

          if (status === "suspended" || status === "revoked") {
            setUserStatus(UserStatus.SUSPENDED);
            setLoginError("Account suspended");
            return;
          }

          navigate({ to: "/dashboard" });
        },
        onError: (error: any) => {
          if (error.response?.data?.status) {
            const rawStatus = (error.response.data.status || "").toLowerCase();
            setUserStatus(rawStatus);

            if (rawStatus === "pending" || rawStatus === "pending_approval") {
              setLoginError("Account pending approval");
            } else if (rawStatus === "rejected") {
              setLoginError("Account rejected");
            } else if (rawStatus === "suspended" || rawStatus === "revoked") {
              setLoginError("Account suspended");
            } else if (rawStatus === "pending_verification") {
              setLoginError("Email not verified");
            } else {
              setLoginError(
                error.response.data.message || "Account not active",
              );
            }
          } else {
            setLoginError(
              error.response?.data?.message || "Invalid email or password",
            );
          }
        },
      },
    );
  };

  const getStatusMessage = () => {
    switch (userStatus?.toLowerCase()) {
      case "pending":
      case "pending_approval":
        return (
          <div className="flex items-start gap-3 bg-zinc-900 p-4 border border-zinc-700">
            <Clock className="flex-shrink-0 mt-0.5 w-4 h-4 text-yellow-500" />
            <div className="font-mono text-xs">
              <p className="text-yellow-500 uppercase tracking-wider">
                &gt; STATUS: PENDING APPROVAL
              </p>
              <p className="mt-1 text-zinc-400">
                Your application is under review. Await admin verification.
              </p>
            </div>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-start gap-3 bg-zinc-900 p-4 border border-zinc-700">
            <XCircle className="flex-shrink-0 mt-0.5 w-4 h-4 text-red-500" />
            <div className="font-mono text-xs">
              <p className="text-red-500 uppercase tracking-wider">
                &gt; STATUS: REJECTED
              </p>
              <p className="mt-1 text-zinc-400">
                Application not approved. Contact support for details.
              </p>
            </div>
          </div>
        );
      case "suspended":
      case "revoked":
        return (
          <div className="flex items-start gap-3 bg-zinc-900 p-4 border border-zinc-700">
            <UserX className="flex-shrink-0 mt-0.5 w-4 h-4 text-orange-500" />
            <div className="font-mono text-xs">
              <p className="text-orange-500 uppercase tracking-wider">
                &gt; STATUS: SUSPENDED
              </p>
              <p className="mt-1 text-zinc-400">
                Account temporarily suspended. Contact administrator.
              </p>
            </div>
          </div>
        );
      case "pending_verification":
      case "pending-verification":
        return (
          <div className="flex flex-col gap-4 bg-zinc-900 p-4 border border-zinc-700">
            <div className="flex items-start gap-3">
              <Mail className="flex-shrink-0 mt-0.5 w-4 h-4 text-emerald-500" />
              <div className="font-mono text-xs">
                <p className="text-emerald-500 uppercase tracking-wider">
                  &gt; STATUS: EMAIL VERIFICATION REQUIRED
                </p>
                <p className="mt-1 text-zinc-400">
                  Please check your inbox and verify your email address to
                  continue.
                </p>
              </div>
            </div>
            <button
              onClick={handleResendVerification}
              disabled={resendMutation.isPending}
              className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 py-2 w-full font-bold text-white text-[10px] uppercase tracking-widest transition-colors border border-zinc-700"
            >
              {resendMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              RESEND VERIFICATION EMAIL
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex md:flex-row flex-col bg-white min-h-screen font-mono">
      {/* Left Panel - Terminal Style Branding with Background Image */}
      <div className="hidden relative md:flex flex-col justify-between p-12 lg:p-16 md:w-[45%] overflow-hidden">
        {/* Background Image - Autism/Therapy Related */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80')] bg-cover bg-center" />

        {/* Gradient Overlay - softer than solid black */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/70 via-zinc-800/75 to-zinc-900/70" />

        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <div className="z-10 relative">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex justify-center items-center border-2 border-white w-10 h-10">
              <Activity size={20} className="text-white" />
            </div>
            <span className="font-bold text-white text-xl uppercase tracking-widest">
              NEUROCARE
            </span>
          </div>

          {/* Headline */}
          <div className="mb-8">
            <p className="mb-2 text-zinc-500 text-xs uppercase tracking-widest">
              CLINICAL INTELLIGENCE
            </p>
            <h1 className="font-bold text-white text-3xl lg:text-4xl leading-tight tracking-tight">
              BEHAVIOR
              <br />
              ANALYSIS
              <br />
              PLATFORM
            </h1>
          </div>

          {/* Description */}
          <p className="max-w-sm text-zinc-400 text-sm leading-relaxed">
            Secure, AI-powered analysis for autism therapy tracking and
            behavioral insights. Enterprise-grade security with HIPAA
            compliance.
          </p>
        </div>

        {/* Bottom Stats */}
        <div className="z-10 relative">
          <div className="gap-px grid grid-cols-2 bg-zinc-800">
            <div className="flex items-center gap-2 bg-black p-4">
              <Shield size={14} className="text-green-500" />
              <span className="text-zinc-300 text-xs uppercase tracking-wider">
                HIPAA COMPLIANT
              </span>
            </div>
            <div className="flex items-center gap-2 bg-black p-4">
              <Key size={14} className="text-green-500" />
              <span className="text-zinc-300 text-xs uppercase tracking-wider">
                AES 256 ENCRYPTED
              </span>
            </div>
          </div>
          <div className="bg-zinc-900 p-3 border-zinc-800 border-t">
            <p className="text-[10px] text-zinc-500 tracking-wider">
              &gt; <span className="text-green-500">AUTISM SUPPORT</span> |
              THERAPY TRACKING | 24/7 CARE
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-1 justify-center items-center bg-zinc-50 p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="flex justify-center items-center border-2 border-black w-10 h-10">
              <Activity size={20} className="text-black" />
            </div>
            <span className="font-bold text-black text-xl uppercase tracking-widest">
              NEUROCARE
            </span>
          </div>

          <div className="bg-white p-8 lg:p-10 border-2 border-zinc-200">
            {/* Header */}
            <div className="mb-8">
              <p className="mb-1 text-zinc-400 text-xs tracking-widest">
                &gt; AUTH MODULE
              </p>
              <h2 className="font-bold text-black text-2xl uppercase tracking-tight">
                SIGN IN
              </h2>
              <div className="bg-black mt-2 w-12 h-0.5" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Status Messages */}
              {userStatus && getStatusMessage()}

              {!userStatus && loginError && (
                <div className="flex items-center gap-3 bg-zinc-900 p-4 border border-zinc-700">
                  <AlertTriangle size={16} className="text-red-500" />
                  <span className="font-mono text-red-400 text-xs uppercase tracking-wider">
                    &gt; ERROR: {loginError}
                  </span>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block mb-2 font-bold text-zinc-600 text-xs uppercase tracking-wider">
                  EMAIL
                </label>
                <div className="relative">
                  <Mail className="top-3.5 left-4 absolute w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    {...register("email")}
                    className={`block w-full pl-11 pr-4 py-3 bg-white border-2 text-black placeholder-zinc-400 focus:outline-none transition-colors text-sm font-mono ${
                      errors.email
                        ? "border-red-500 focus:border-red-600"
                        : "border-zinc-200 focus:border-black"
                    }`}
                    placeholder="user@clinic.org"
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-red-600 text-xs">
                    &gt; {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block mb-2 font-bold text-zinc-600 text-xs uppercase tracking-wider">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="top-3.5 left-4 absolute w-4 h-4 text-zinc-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    className={`block w-full pl-11 pr-12 py-3 bg-white border-2 text-black placeholder-zinc-400 focus:outline-none transition-colors text-sm font-mono ${
                      errors.password
                        ? "border-red-500 focus:border-red-600"
                        : "border-zinc-200 focus:border-black"
                    }`}
                    placeholder="••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="top-3.5 right-4 absolute text-zinc-400 hover:text-black transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-red-600 text-xs">
                    &gt; {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember & Forgot */}
              <div className="flex justify-between items-center">
                <label className="group flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="border-2 border-zinc-300 focus:ring-0 w-4 h-4 text-black"
                  />
                  <span className="ml-2 text-zinc-600 group-hover:text-black text-xs uppercase tracking-wider transition-colors">
                    REMEMBER ME
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/forgot-password" })}
                  className="font-bold text-zinc-500 hover:text-black text-xs uppercase tracking-wider transition-colors"
                >
                  FORGOT PASSWORD?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="flex justify-center items-center bg-black hover:bg-zinc-800 disabled:bg-zinc-300 py-4 w-full font-bold text-white text-sm uppercase tracking-widest transition-colors disabled:cursor-not-allowed"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    AUTHENTICATING...
                  </>
                ) : (
                  <>
                    SIGN IN <ArrowRight size={16} className="ml-2" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center my-8">
              <div className="flex-1 border-zinc-100 border-t-2" />
              <span className="px-4 font-bold text-zinc-400 text-xs uppercase tracking-wider">
                OR
              </span>
              <div className="flex-1 border-zinc-100 border-t-2" />
            </div>

            {/* Register Link */}
            <button
              type="button"
              onClick={() => navigate({ to: "/register/therapist" })}
              className="flex justify-center items-center bg-white hover:bg-zinc-50 py-4 border-2 border-zinc-200 hover:border-black w-full font-bold text-black text-sm uppercase tracking-widest transition-all"
            >
              REGISTER AS THERAPIST
            </button>

            {/* Footer */}
            <div className="mt-8 pt-6 border-zinc-100 border-t">
              <p className="text-[10px] text-zinc-400 text-center uppercase tracking-wider">
                PROTECTED BY NEUROCARE SECURE AUTH v2.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
