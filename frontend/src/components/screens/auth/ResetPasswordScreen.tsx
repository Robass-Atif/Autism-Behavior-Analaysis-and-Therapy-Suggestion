
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUpdatePassword } from '../../../api/auth';
import { 
  Lock, 
  ArrowRight, 
  Loader2, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  Activity, 
  Shield, 
  Key,
  AlertTriangle 
} from 'lucide-react';

const resetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, "Must contain an uppercase letter").regex(/[0-9]/, "Must contain a number"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetFormInputs = z.infer<typeof resetSchema>;

export default function ResetPasswordScreen({ onLogin }: { onLogin: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetFormInputs>({
    resolver: zodResolver(resetSchema)
  });

  const resetMutation = useUpdatePassword();
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token') || '';

  if (resetMutation.isSuccess) {
    return (
      <div className="flex md:flex-row flex-col bg-white min-h-screen font-mono">
        <div className="hidden relative md:flex flex-col justify-between p-12 lg:p-16 md:w-[45%] overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/70 via-zinc-800/75 to-zinc-900/70" />
          <div className="z-10 relative">
            <div className="flex items-center gap-3 mb-12">
              <div className="flex justify-center items-center border-2 border-white w-10 h-10">
                <Activity size={20} className="text-white" />
              </div>
              <span className="font-bold text-white text-xl uppercase tracking-widest">NEUROCARE</span>
            </div>
            <h1 className="font-bold text-white text-3xl lg:text-4xl leading-tight tracking-tight uppercase">Password<br/>Security<br/>Update</h1>
          </div>
        </div>

        <div className="flex flex-1 justify-center items-center bg-zinc-50 p-6 md:p-12 lg:p-16">
          <div className="max-w-md w-full bg-white p-8 lg:p-10 border-2 border-zinc-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-zinc-900 flex items-center justify-center mx-auto mb-6 text-emerald-500 border-2 border-zinc-700 shadow-lg">
                <CheckCircle size={32} />
              </div>
              <p className="mb-1 text-zinc-400 text-[10px] tracking-widest uppercase">&gt; SUCCESS_LOG</p>
              <h2 className="text-xl font-bold text-black uppercase tracking-tight">Update Complete</h2>
              <div className="bg-black mt-2 w-12 h-0.5 mx-auto" />
              <p className="text-zinc-500 mt-4 text-sm leading-relaxed">Your password has been securely updated. Authentication required for next session.</p>
            </div>
            <button 
              onClick={onLogin} 
              className="w-full flex justify-center items-center bg-black hover:bg-zinc-800 text-white py-4 font-bold text-sm uppercase tracking-widest transition-colors"
            >
              RETURN TO LOGIN <ArrowRight size={16} className="ml-2" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex md:flex-row flex-col bg-white min-h-screen font-mono">
      {/* Left Panel - Terminal Style Branding */}
      <div className="hidden relative md:flex flex-col justify-between p-12 lg:p-16 md:w-[45%] overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/70 via-zinc-800/75 to-zinc-900/70" />
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }} />
        </div>

        <div className="z-10 relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex justify-center items-center border-2 border-white w-10 h-10">
              <Activity size={20} className="text-white" />
            </div>
            <span className="font-bold text-white text-xl uppercase tracking-widest">NEUROCARE</span>
          </div>
          <div className="mb-8">
            <p className="mb-2 text-zinc-500 text-xs uppercase tracking-widest">CLINICAL INTELLIGENCE</p>
            <h1 className="font-bold text-white text-3xl lg:text-4xl leading-tight tracking-tight uppercase">
              SECURITY<br/>RECOVERY<br/>MODULE
            </h1>
          </div>
          <p className="max-w-sm text-zinc-400 text-sm leading-relaxed">
            Finalize your account recovery by establishing a new high-entropy password. 
            All changes are logged and encrypted.
          </p>
        </div>

        <div className="z-10 relative">
          <div className="gap-px grid grid-cols-2 bg-zinc-800">
            <div className="flex items-center gap-2 bg-black p-4">
              <Shield size={14} className="text-green-500" />
              <span className="text-zinc-300 text-xs uppercase tracking-wider">HIPAA SECURE</span>
            </div>
            <div className="flex items-center gap-2 bg-black p-4">
              <Key size={14} className="text-green-500" />
              <span className="text-zinc-300 text-xs uppercase tracking-wider">RSA 4096 BIT</span>
            </div>
          </div>
          <div className="bg-zinc-900 p-3 border-zinc-800 border-t">
            <p className="text-[10px] text-zinc-500 tracking-wider">&gt; <span className="text-green-500">ENCRYPTION ACTIVE</span> | RECOVERY_INIT | 0x7F42</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex flex-1 justify-center items-center bg-zinc-50 p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="flex justify-center items-center border-2 border-black w-10 h-10">
              <Activity size={20} className="text-black" />
            </div>
            <span className="font-bold text-black text-xl uppercase tracking-widest">NEUROCARE</span>
          </div>

          <div className="bg-white p-8 lg:p-10 border-2 border-zinc-200">
            <div className="mb-8">
              <h2 className="font-bold text-black text-2xl uppercase tracking-tight">SET NEW PASSWORD</h2>
              <div className="bg-black mt-2 w-12 h-0.5" />
            </div>

            <form onSubmit={handleSubmit((d) => resetMutation.mutate({ token, newPassword: d.password, confirmPassword: d.confirmPassword }))} className="space-y-6">
              
              {resetMutation.error && (
                <div className="flex items-center gap-3 bg-zinc-900 p-4 border border-zinc-700">
                  <AlertTriangle size={16} className="text-red-500" />
                  <span className="font-mono text-red-400 text-xs uppercase tracking-wider">
                    &gt; ERROR: {(resetMutation.error as any)?.message || 'Update Failed'}
                  </span>
                </div>
              )}

              <div>
                <label className="block mb-2 font-bold text-zinc-600 text-xs uppercase tracking-wider">NEW PASSWORD</label>
                <div className="relative">
                  <Lock className="top-3.5 left-4 absolute w-4 h-4 text-zinc-400" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    {...register('password')} 
                    className={`block w-full pl-11 pr-12 py-3 bg-white border-2 text-black placeholder-zinc-400 focus:outline-none transition-colors text-sm font-mono ${
                      errors.password ? 'border-red-500 focus:border-red-600' : 'border-zinc-200 focus:border-black'
                    }`}
                    placeholder="••••••••" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="top-3.5 right-4 absolute text-zinc-400 hover:text-black transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-2 text-red-600 text-[10px]">&gt; {errors.password.message}</p>}
              </div>

              <div>
                <label className="block mb-2 font-bold text-zinc-600 text-xs uppercase tracking-wider">CONFIRM PASSWORD</label>
                <div className="relative">
                  <Lock className="top-3.5 left-4 absolute w-4 h-4 text-zinc-400" />
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    {...register('confirmPassword')} 
                    className={`block w-full pl-11 pr-12 py-3 bg-white border-2 text-black placeholder-zinc-400 focus:outline-none transition-colors text-sm font-mono ${
                      errors.confirmPassword ? 'border-red-500 focus:border-red-600' : 'border-zinc-200 focus:border-black'
                    }`}
                    placeholder="••••••••" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="top-3.5 right-4 absolute text-zinc-400 hover:text-black transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-2 text-red-600 text-[10px]">&gt; {errors.confirmPassword.message}</p>}
              </div>


              <button 
                type="submit" 
                disabled={resetMutation.isPending} 
                className="w-full flex justify-center items-center bg-black hover:bg-zinc-800 disabled:bg-zinc-300 py-4 font-bold text-white text-sm uppercase tracking-widest transition-colors disabled:cursor-not-allowed"
              >
                {resetMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={16} /> PROCESSING...
                  </>
                ) : (
                  <>
                    RESET PASSWORD <ArrowRight size={16} className="ml-2" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-zinc-100 border-t">
              <p className="text-[10px] text-zinc-400 text-center uppercase tracking-wider">
                NEUROCARE SECURE RECOVERY v2.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
