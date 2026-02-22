
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUpdatePassword } from '../../../api/auth';
import { Lock, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

const resetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, "Must contain an uppercase letter").regex(/[0-9]/, "Must contain a number"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetFormInputs = z.infer<typeof resetSchema>;

export default function ResetPasswordScreen({ onLogin }: { onLogin: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<ResetFormInputs>({
    resolver: zodResolver(resetSchema)
  });

  const resetMutation = useUpdatePassword();
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token') || '';

  if (resetMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4 md:p-6">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-lg shadow-emerald-200/50">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Reset Complete</h2>
          <p className="text-slate-500 mt-2 mb-8 text-base">Your password has been securely updated. You can now log in with your new credentials.</p>
          <button onClick={onLogin} className="w-full py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/25 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4 md:p-6">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Set New Password</h2>
          <p className="text-slate-500 mt-2 text-base">Please choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit((d) => resetMutation.mutate({ token, password: d.password, confirmPassword: d.confirmPassword }))} className="space-y-6">

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input type="password" {...register('password')} className="block w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-blue-500 outline-none transition-all placeholder-slate-400" placeholder="••••••••" />
            </div>
            {errors.password && <p className="mt-2 text-xs text-red-600 font-medium">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input type="password" {...register('confirmPassword')} className="block w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-blue-500 outline-none transition-all placeholder-slate-400" placeholder="••••••••" />
            </div>
            {errors.confirmPassword && <p className="mt-2 text-xs text-red-600 font-medium">{errors.confirmPassword.message}</p>}
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-500 space-y-1.5">
            <p className="font-semibold text-slate-700 mb-2 text-sm">Password Requirements:</p>
            <p className="flex items-center gap-2">• At least 8 characters</p>
            <p className="flex items-center gap-2">• At least one uppercase letter</p>
            <p className="flex items-center gap-2">• At least one number</p>
          </div>

          <button type="submit" disabled={resetMutation.isPending} className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/25 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-70 disabled:shadow-none transition-all">
            {resetMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <>Reset Password <ArrowRight size={18} className="ml-2" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
