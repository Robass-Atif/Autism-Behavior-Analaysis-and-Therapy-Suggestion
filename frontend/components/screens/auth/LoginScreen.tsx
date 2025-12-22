
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserRole } from '../../../types';
import { useLogin } from '../../../api/auth'; // Updated Import
import { Eye, EyeOff, Lock, Mail, ArrowRight, Activity, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

// Zod Schema for Validation
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

interface LoginScreenProps {
  onLogin: (role: UserRole) => void;
  onForgotPassword: () => void;
}

export default function LoginScreen({ onLogin, onForgotPassword }: LoginScreenProps) {
  const [role, setRole] = useState<UserRole>(UserRole.THERAPIST);
  const [showPassword, setShowPassword] = useState(false);

  // React Hook Form Setup
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'dr.sarah@neurocare.com',
      password: 'password123'
    }
  });

  // Login Mutation using new hook
  const loginMutation = useLogin();

  const onSubmit = (data: LoginFormInputs) => {
    loginMutation.mutate({ email: data.email, role }, {
      onSuccess: () => onLogin(role),
      onError: (error) => console.error(error)
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans">
      {/* Left Panel - Brand */}
      <div className="hidden md:flex md:w-1/2 bg-slate-900 relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white mb-12">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Activity size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">NeuroCare</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight max-w-lg mb-6">
            Clinical intelligence for better patient outcomes.
          </h1>
          <p className="text-slate-400 text-lg max-w-md">
            Secure, AI-powered analysis for autism therapy tracking and behavioral insights.
          </p>
        </div>
        
        <div className="relative z-10 flex gap-6 text-sm text-slate-400">
           <span className="flex items-center gap-2"><ShieldCheck size={16} /> HIPAA Compliant</span>
           <span>•</span>
           <span>AES-256 Encryption</span>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="max-w-md w-full">
          <div className="text-center md:text-left mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-slate-500 mt-2">Welcome back. Please enter your credentials.</p>
          </div>

          {/* Role Toggle */}
          <div className="p-1 bg-slate-100 rounded-lg flex mb-8">
            <button
              type="button"
              onClick={() => setRole(UserRole.THERAPIST)}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                role === UserRole.THERAPIST
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Therapist
            </button>
            <button
              type="button"
              onClick={() => setRole(UserRole.CAREGIVER)}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                role === UserRole.CAREGIVER
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Caregiver
            </button>
             <button
              type="button"
              onClick={() => setRole(UserRole.ADMIN)}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                role === UserRole.ADMIN
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Global Error Message */}
            {loginMutation.isError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                <span>Invalid credentials. Please try again.</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  {...register('email')}
                  className={`block w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all text-sm ${
                    errors.email 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                  placeholder="name@clinic.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={`block w-full pl-10 pr-10 py-2.5 bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all text-sm ${
                    errors.password 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="ml-2 text-sm text-slate-600">Remember me</span>
              </label>
              <button type="button" onClick={onForgotPassword} className="text-sm font-medium text-blue-600 hover:text-blue-700">Forgot password?</button>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
               Protected by NeuroCare Secure Auth. By logging in, you agree to our <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
