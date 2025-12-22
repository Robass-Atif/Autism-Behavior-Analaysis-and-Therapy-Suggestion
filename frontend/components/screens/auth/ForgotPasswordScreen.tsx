import React from 'react';
import { Mail, ArrowLeft, Send } from 'lucide-react';

export default function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm mb-6">
          <ArrowLeft size={16} /> Back to Login
        </button>
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
            <Mail size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Forgot password?</h2>
          <p className="text-slate-500 mt-2 text-sm">No worries, we'll send you reset instructions.</p>
        </div>

        {submitted ? (
          <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
            <h3 className="text-green-800 font-medium">Check your email</h3>
            <p className="text-green-600 text-sm mt-1">We sent a password reset link to your email address.</p>
            <button onClick={onBack} className="mt-4 w-full py-2 bg-white border border-green-200 text-green-700 font-medium rounded-lg text-sm hover:bg-green-50">Back to Login</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
              <input type="email" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" placeholder="Enter your email" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
              <Send size={16} /> Send Reset Link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}