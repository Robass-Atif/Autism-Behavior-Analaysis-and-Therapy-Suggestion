import React from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

export default function ErrorScreen({ error, resetErrorBoundary }: any) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-slate-100">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
          <AlertOctagon size={40} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-slate-500 mb-8">We encountered an unexpected error. Our team has been notified.</p>
        
        <div className="bg-red-50 p-4 rounded-lg text-left mb-8 border border-red-100 overflow-auto max-h-32">
          <code className="text-xs text-red-700 font-mono">{error?.message || "Unknown Error"}</code>
        </div>
        
        <div className="space-y-3">
          <button onClick={resetErrorBoundary} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 transition-all">
            <RefreshCw size={18} /> Try Again
          </button>
          <button className="w-full py-3 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 border border-slate-200 flex items-center justify-center gap-2 transition-all">
            <Home size={18} /> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}