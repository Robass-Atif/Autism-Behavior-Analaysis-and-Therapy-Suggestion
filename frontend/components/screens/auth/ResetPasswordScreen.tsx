
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

  if (resetMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Password Reset Complete</h2>
          <p className="text-slate-500 mt-2 mb-6">Your password has been securely updated. You can now log in with your new credentials.</p>
          <button onClick={onLogin} className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Set New Password</h2>
          <p className="text-slate-500 mt-2 text-sm">Please choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit((d) => resetMutation.mutate(d.password))} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input type="password" {...register('password')} className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="••••••••" />
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input type="password" {...register('confirmPassword')} className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="••••••••" />
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
          </div>

          <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-700 mb-1">Password Requirements:</p>
            <p>• At least 8 characters</p>
            <p>• At least one uppercase letter</p>
            <p>• At least one number</p>
          </div>

          <button type="submit" disabled={resetMutation.isPending} className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70">
            {resetMutation.isPending ? <Loader2 className="animate-spin" /> : <>Reset Password <ArrowRight size={16} className="ml-2" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
