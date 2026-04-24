import React from 'react';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { useForgotPassword } from '../../../api/auth';

export default function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const forgotPasswordMutation = useForgotPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    forgotPasswordMutation.mutate(
      { email },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
        onError: (error) => {
          console.error('Forgot password error:', error);
          // Optionally show a toast/error UI here
        },
      }
    );
  };

  return (
    <div className="flex md:flex-row flex-col bg-white min-h-screen font-mono">
      {/* Left Panel - Branding with image */}
      <div className="hidden relative md:flex flex-col justify-between p-12 lg:p-16 md:w-[45%] overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://media.istockphoto.com/id/2188644031/photo/a-childs-hand-placing-a-white-cube-with-the-letter-a-on-top-of-a-pyramid-of-cubes-spelling.webp?a=1&b=1&s=612x612&w=0&k=20&c=NwE4lR8ogXmNJNHP1Bbk5outPhkfZGP6myrG0fpiiD0=')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/70 via-zinc-800/75 to-zinc-900/70" />
        <div className="absolute inset-0 opacity-30">
          <div className="w-full h-full" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />
        </div>
        <div className="z-10 relative flex flex-col justify-center h-full text-white">
          <h1 className="font-bold text-4xl lg:text-5xl tracking-tight mb-4">FORGOT PASSWORD</h1>
          <p className="text-sm text-zinc-300 max-w-sm">Enter your email and we'll send a secure reset link.</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex flex-1 justify-center items-center p-6 md:p-12 lg:p-16 bg-zinc-50">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 lg:p-10 border border-zinc-200 rounded-2xl shadow-xl">
            <button onClick={onBack} className="flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-800 mb-6">
              <ArrowLeft size={16} /> Back to Login
            </button>
            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-center">
                <h3 className="text-emerald-800 font-semibold mb-2">Check your email</h3>
                <p className="text-emerald-600 text-sm">We sent a password reset link to your inbox.</p>
                <button onClick={onBack} className="mt-5 w-full py-3 bg-white border-2 border-emerald-200 text-emerald-700 font-semibold rounded-xl text-sm hover:bg-emerald-50 transition-all">
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block mb-2 text-xs font-semibold text-zinc-800 uppercase tracking-wider">EMAIL ADDRESS</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-5 w-5 text-zinc-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 border-2 rounded-xl text-black placeholder-zinc-400 focus:outline-none focus:ring-0 focus:border-black transition-colors text-sm font-mono"
                      placeholder="you@domain.com"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={forgotPasswordMutation.isPending}
                  className="w-full flex justify-center items-center bg-black hover:bg-zinc-800 text-white py-3 rounded-xl font-medium text-sm uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {forgotPasswordMutation.isPending ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}