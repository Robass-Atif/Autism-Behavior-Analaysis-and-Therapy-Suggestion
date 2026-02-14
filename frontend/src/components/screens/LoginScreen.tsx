import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserRole } from "../../types";
import { api } from "../../lib/api";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  Activity,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";

// Zod Schema for Validation
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

interface LoginScreenProps {
  onLogin: (role: UserRole) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [role, setRole] = useState<UserRole>(UserRole.THERAPIST);
  const [showPassword, setShowPassword] = useState(false);

  // React Hook Form Setup
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "dr.sarah@neurocare.com",
      password: "password123",
    },
  });

  // Login Mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginFormInputs) => api.login(data.email, role),
    onSuccess: () => {
      onLogin(role);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const onSubmit = (data: LoginFormInputs) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="flex md:flex-row flex-col bg-white min-h-screen font-sans">
      {/* Left Panel - Brand */}
      <div className="hidden relative md:flex flex-col justify-between bg-slate-900 p-12 md:w-1/2 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="z-10 relative">
          <div className="flex items-center gap-3 mb-12 text-white">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Activity size={24} className="text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight">NeuroCare</span>
          </div>
          <h1 className="mb-6 max-w-lg font-bold text-white text-4xl leading-tight">
            Clinical intelligence for better patient outcomes.
          </h1>
          <p className="max-w-md text-slate-400 text-lg">
            Secure, AI-powered analysis for autism therapy tracking and
            behavioral insights.
          </p>
        </div>

        <div className="z-10 relative flex gap-6 text-slate-400 text-sm">
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} /> HIPAA Compliant
          </span>
          <span>•</span>
          <span>AES-256 Encryption</span>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-1 justify-center items-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 md:text-left text-center">
            <h2 className="font-bold text-slate-900 text-2xl">
              Sign in to your account
            </h2>
            <p className="mt-2 text-slate-500">
              Welcome back. Please enter your credentials.
            </p>
          </div>

          {/* Role Toggle */}
          <div className="flex bg-slate-100 mb-8 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setRole(UserRole.THERAPIST)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                role === UserRole.THERAPIST
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Therapist
            </button>
            <button
              type="button"
              onClick={() => setRole(UserRole.CAREGIVER)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                role === UserRole.CAREGIVER
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Caregiver
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Global Error Message */}
            {loginMutation.isError && (
              <div className="flex items-center gap-2 bg-red-50 p-3 border border-red-100 rounded-lg text-red-600 text-sm">
                <AlertCircle size={16} />
                <span>Invalid credentials. Please try again.</span>
              </div>
            )}

            <div>
              <label className="block mb-1.5 font-medium text-slate-700 text-sm">
                Email address
              </label>
              <div className="relative">
                <Mail className="top-2.5 left-3 absolute w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  {...register("email")}
                  className={`block w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all text-sm ${
                    errors.email
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                  placeholder="name@clinic.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 font-medium text-red-500 text-xs">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block mb-1.5 font-medium text-slate-700 text-sm">
                Password
              </label>
              <div className="relative">
                <Lock className="top-2.5 left-3 absolute w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  className={`block w-full pl-10 pr-10 py-2.5 bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all text-sm ${
                    errors.password
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="top-2.5 right-3 absolute focus:outline-none text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 font-medium text-red-500 text-xs">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="border-slate-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-600"
                />
                <span className="ml-2 text-slate-600 text-sm">Remember me</span>
              </label>
              <a
                href="#"
                className="font-medium text-blue-600 hover:text-blue-700 text-sm"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="flex justify-center items-center bg-blue-600 hover:bg-blue-700 disabled:opacity-70 shadow-sm px-4 py-2.5 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full font-semibold text-white text-sm transition-all disabled:cursor-not-allowed"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-slate-100 border-t text-center">
            <p className="text-slate-400 text-xs">
              Protected by NeuroCare Secure Auth. By logging in, you agree to
              our{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Terms of Service
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
